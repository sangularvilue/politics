import { v4 as uuid } from "uuid";
import {
  redis, annotKey, repliesKey, idxAll, idxBook, idxChapter, idxTag, idxUser, namesKey, tagsKey, authorsKey,
  notifsKey, notifsSeenKey,
} from "./redis";
import type { Annotation, AnnotationThread, Anchor, Reply, Notification } from "./types";

/** Author of a comment — a real user id, or a synthetic guest id for "posted as". */
export interface Author { id: string; name: string }
export interface Requester { id: string; isAdmin?: boolean }

/** Stable synthetic id for a named guest author (so they get a browsable author page). */
export function guestId(name: string): string {
  return "guest:" + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (t && t.length <= 40 && !seen.has(t)) { seen.add(t); out.push(t); }
    if (out.length >= 8) break;
  }
  return out;
}

// ---- create ----
export async function createAnnotation(
  author: Author,
  input: { book: number; chapter: number; anchors: Anchor[]; quote: string; body: string; tags: string[] }
): Promise<Annotation> {
  const now = Date.now();
  const a: Annotation = {
    id: uuid(),
    userId: author.id,
    authorName: author.name,
    book: input.book,
    chapter: input.chapter,
    anchors: input.anchors,
    quote: input.quote.slice(0, 2000),
    body: input.body.slice(0, 8000),
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now,
    replyCount: 0,
  };
  const p = redis.pipeline();
  p.set(annotKey(a.id), a);
  p.zadd(idxAll(), { score: now, member: a.id });
  p.zadd(idxBook(a.book), { score: now, member: a.id });
  p.zadd(idxChapter(a.book, a.chapter), { score: now, member: a.id });
  p.zadd(idxUser(a.userId), { score: now, member: a.id });
  p.zincrby(authorsKey(), 1, a.userId);
  p.hset(namesKey(), { [a.userId]: a.authorName });
  for (const t of a.tags) {
    p.zadd(idxTag(t), { score: now, member: a.id });
    p.zincrby(tagsKey(), 1, t);
  }
  await p.exec();
  return a;
}

export async function getAnnotation(id: string): Promise<Annotation | null> {
  return redis.get<Annotation>(annotKey(id));
}

export async function getReplies(annotId: string): Promise<Reply[]> {
  const raw = await redis.lrange<Reply>(repliesKey(annotId), 0, -1);
  return raw.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getThread(id: string): Promise<AnnotationThread | null> {
  const a = await getAnnotation(id);
  if (!a) return null;
  const replies = await getReplies(id);
  return { ...a, replies };
}

async function hydrate(ids: string[]): Promise<Annotation[]> {
  if (!ids.length) return [];
  const keys = ids.map(annotKey);
  const rows = await redis.mget<Annotation[]>(...keys);
  return rows.filter((r): r is Annotation => !!r);
}

// ---- queries (newest first) ----
export async function listByChapter(book: number, chapter: number): Promise<Annotation[]> {
  const ids = await redis.zrange<string[]>(idxChapter(book, chapter), 0, -1, { rev: true });
  return hydrate(ids);
}
export async function listByBook(book: number): Promise<Annotation[]> {
  const ids = await redis.zrange<string[]>(idxBook(book), 0, -1, { rev: true });
  return hydrate(ids);
}
export async function listByTag(tag: string): Promise<Annotation[]> {
  const ids = await redis.zrange<string[]>(idxTag(tag), 0, -1, { rev: true });
  return hydrate(ids);
}
export async function listByUser(userId: string): Promise<Annotation[]> {
  const ids = await redis.zrange<string[]>(idxUser(userId), 0, -1, { rev: true });
  return hydrate(ids);
}
export async function listRecent(limit = 40): Promise<Annotation[]> {
  const ids = await redis.zrange<string[]>(idxAll(), 0, limit - 1, { rev: true });
  return hydrate(ids);
}

export async function topTags(limit = 50): Promise<{ tag: string; count: number }[]> {
  const rows = await redis.zrange<(string | number)[]>(tagsKey(), 0, limit - 1, {
    rev: true, withScores: true,
  });
  const out: { tag: string; count: number }[] = [];
  for (let i = 0; i < rows.length; i += 2) out.push({ tag: String(rows[i]), count: Number(rows[i + 1]) });
  return out;
}

export async function authorName(userId: string): Promise<string> {
  return (await redis.hget<string>(namesKey(), userId)) || "Anonymous";
}

export async function listAuthors(limit = 200): Promise<{ id: string; name: string; count: number }[]> {
  const rows = await redis.zrange<(string | number)[]>(authorsKey(), 0, limit - 1, { rev: true, withScores: true });
  const out: { id: string; name: string; count: number }[] = [];
  const ids: string[] = [];
  const counts: number[] = [];
  for (let i = 0; i < rows.length; i += 2) { ids.push(String(rows[i])); counts.push(Number(rows[i + 1])); }
  if (!ids.length) return out;
  const names = await redis.hmget<Record<string, string>>(namesKey(), ...ids);
  ids.forEach((id, i) => { if (counts[i] > 0) out.push({ id, name: names?.[id] || "Anonymous", count: counts[i] }); });
  return out;
}

// ---- replies ----
const NOTIFS_MAX = 200;

export async function addReply(
  author: Author, annotId: string, body: string, parentId: string | null
): Promise<Reply | null> {
  const a = await getAnnotation(annotId);
  if (!a) return null;
  const reply: Reply = {
    id: uuid(),
    annotationId: annotId,
    userId: author.id,
    authorName: author.name,
    body: body.slice(0, 8000),
    parentId: parentId,
    createdAt: Date.now(),
  };
  a.replyCount = (a.replyCount || 0) + 1;
  a.updatedAt = reply.createdAt;

  // Notify the annotation's owner and, for a nested reply, the author of the
  // reply being responded to. Never the actor themselves; guest authors
  // ("posted as") can't sign in, so they take no notifications.
  const recipients = new Set<string>();
  if (a.userId !== author.id && !a.userId.startsWith("guest:")) recipients.add(a.userId);
  if (parentId) {
    const parent = (await getReplies(annotId)).find((r) => r.id === parentId);
    if (parent && parent.userId !== author.id && !parent.userId.startsWith("guest:")) recipients.add(parent.userId);
  }

  const p = redis.pipeline();
  p.rpush(repliesKey(annotId), reply);
  p.set(annotKey(annotId), a);
  p.hset(namesKey(), { [author.id]: author.name });
  for (const uid of recipients) {
    const n: Notification = {
      id: uuid(),
      type: "reply",
      reason: uid === a.userId ? "annotation" : "reply",
      annotationId: annotId,
      replyId: reply.id,
      actorId: author.id,
      actorName: author.name,
      book: a.book,
      chapter: a.chapter,
      quote: a.quote.slice(0, 120),
      preview: reply.body.slice(0, 160),
      createdAt: reply.createdAt,
    };
    p.lpush(notifsKey(uid), n);
    p.ltrim(notifsKey(uid), 0, NOTIFS_MAX - 1);
  }
  await p.exec();
  return reply;
}

// ---- notifications ----
export async function listNotifications(
  userId: string
): Promise<{ notifications: (Notification & { unread: boolean })[]; unread: number }> {
  const [items, seenRaw] = await Promise.all([
    redis.lrange<Notification>(notifsKey(userId), 0, -1),
    redis.get<number>(notifsSeenKey(userId)),
  ]);
  const seenAt = Number(seenRaw || 0);
  let unread = 0;
  const notifications = items.map((n) => {
    const isUnread = n.createdAt > seenAt;
    if (isUnread) unread++;
    return { ...n, unread: isUnread };
  });
  return { notifications, unread };
}

export async function markNotificationsSeen(userId: string): Promise<void> {
  await redis.set(notifsSeenKey(userId), Date.now());
}

// ---- edit / delete: annotations (owner or admin) ----
export async function updateAnnotation(
  id: string,
  patch: { body?: string; tags?: string[]; author?: Author; anchors?: Anchor[]; quote?: string },
  requester: Requester
): Promise<Annotation | null | "forbidden"> {
  const a = await getAnnotation(id);
  if (!a) return null;
  if (a.userId !== requester.id && !requester.isAdmin) return "forbidden";

  const now = Date.now();
  const p = redis.pipeline();

  if (typeof patch.body === "string") a.body = patch.body.slice(0, 8000);
  if (patch.anchors && patch.anchors.length) {
    a.anchors = patch.anchors;
    if (typeof patch.quote === "string") a.quote = patch.quote.slice(0, 2000);
  }

  if (patch.tags) {
    const newTags = normalizeTags(patch.tags);
    for (const t of a.tags) if (!newTags.includes(t)) { p.zrem(idxTag(t), id); p.zincrby(tagsKey(), -1, t); }
    for (const t of newTags) if (!a.tags.includes(t)) { p.zadd(idxTag(t), { score: a.createdAt, member: id }); p.zincrby(tagsKey(), 1, t); }
    a.tags = newTags;
  }

  // admin may reassign authorship
  if (patch.author && requester.isAdmin) {
    if (patch.author.id !== a.userId) {
      p.zrem(idxUser(a.userId), id);
      p.zincrby(authorsKey(), -1, a.userId);
      p.zadd(idxUser(patch.author.id), { score: a.createdAt, member: id });
      p.zincrby(authorsKey(), 1, patch.author.id);
      a.userId = patch.author.id;
    }
    a.authorName = patch.author.name;
    p.hset(namesKey(), { [a.userId]: a.authorName });
  }

  a.editedAt = now; a.updatedAt = now;
  p.set(annotKey(id), a);
  await p.exec();
  return a;
}

// ---- search across comments ----
export interface CommentHit {
  annotationId: string;
  book: number;
  chapter: number;
  authorName: string;
  kind: "comment" | "quote" | "tag" | "reply";
  snippet: string;
  cite: string;
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function snippetAround(text: string, needle: string, pad = 70): string {
  const i = text.toLowerCase().indexOf(needle);
  if (i < 0) return text.slice(0, 160);
  const from = Math.max(0, i - pad);
  const to = Math.min(text.length, i + needle.length + pad + 40);
  return (from > 0 ? "…" : "") + text.slice(from, to).trim() + (to < text.length ? "…" : "");
}

export async function searchAnnotations(q: string, limit = 60): Promise<CommentHit[]> {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const ids = await redis.zrange<string[]>(idxAll(), 0, 999, { rev: true });
  const annots = await hydrate(ids);
  if (!annots.length) return [];

  const p = redis.pipeline();
  for (const a of annots) p.lrange(repliesKey(a.id), 0, -1);
  const replyLists = (await p.exec()) as Reply[][];

  const hits: CommentHit[] = [];
  annots.forEach((a, i) => {
    const cite = `${ROMAN[a.book]}.${a.chapter}`;
    const push = (kind: CommentHit["kind"], snippet: string) => {
      if (hits.length < limit) hits.push({ annotationId: a.id, book: a.book, chapter: a.chapter, authorName: a.authorName, kind, snippet, cite });
    };
    if (a.body.toLowerCase().includes(needle)) push("comment", snippetAround(a.body, needle));
    else if (a.quote.toLowerCase().includes(needle)) push("quote", "“" + snippetAround(a.quote, needle) + "”");
    else if (a.tags.some((t) => t.includes(needle))) push("tag", a.tags.map((t) => `#${t}`).join(" "));
    for (const rp of replyLists[i] || []) {
      if (rp.body?.toLowerCase().includes(needle)) push("reply", snippetAround(rp.body, needle));
    }
  });
  return hits;
}

// ---- delete (owner or admin) ----
export async function deleteAnnotation(id: string, requester: Requester): Promise<boolean> {
  const a = await getAnnotation(id);
  if (!a || (a.userId !== requester.id && !requester.isAdmin)) return false;
  const p = redis.pipeline();
  p.del(annotKey(id));
  p.del(repliesKey(id));
  p.zrem(idxAll(), id);
  p.zrem(idxBook(a.book), id);
  p.zrem(idxChapter(a.book, a.chapter), id);
  p.zrem(idxUser(a.userId), id);
  p.zincrby(authorsKey(), -1, a.userId);
  for (const t of a.tags) {
    p.zrem(idxTag(t), id);
    p.zincrby(tagsKey(), -1, t);
  }
  await p.exec();
  return true;
}

// ---- edit / delete: replies (owner or admin) ----
export async function updateReply(
  annotId: string, replyId: string, patch: { body?: string; author?: Author }, requester: Requester
): Promise<Reply | null | "forbidden"> {
  const replies = await redis.lrange<Reply>(repliesKey(annotId), 0, -1);
  const rp = replies.find((r) => r.id === replyId);
  if (!rp) return null;
  if (rp.userId !== requester.id && !requester.isAdmin) return "forbidden";
  if (typeof patch.body === "string") rp.body = patch.body.slice(0, 8000);
  if (patch.author && requester.isAdmin) { rp.userId = patch.author.id; rp.authorName = patch.author.name; }
  rp.editedAt = Date.now();
  // rewrite the list in order
  const p = redis.pipeline();
  p.del(repliesKey(annotId));
  for (const r of replies) p.rpush(repliesKey(annotId), r);
  if (patch.author && requester.isAdmin) p.hset(namesKey(), { [rp.userId]: rp.authorName });
  await p.exec();
  return rp;
}

export async function deleteReply(annotId: string, replyId: string, requester: Requester): Promise<boolean> {
  const replies = await redis.lrange<Reply>(repliesKey(annotId), 0, -1);
  const rp = replies.find((r) => r.id === replyId);
  if (!rp) return false;
  if (rp.userId !== requester.id && !requester.isAdmin) return false;
  const remaining = replies.filter((r) => r.id !== replyId);
  const a = await getAnnotation(annotId);
  const p = redis.pipeline();
  p.del(repliesKey(annotId));
  for (const r of remaining) p.rpush(repliesKey(annotId), r);
  if (a) { a.replyCount = Math.max(0, (a.replyCount || 1) - 1); p.set(annotKey(annotId), a); }
  await p.exec();
  return true;
}
