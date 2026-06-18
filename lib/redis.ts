import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// All keys live under the `politics:` namespace so the shared grannis.xyz
// Upstash instance stays tidy (blog uses `blog:`, pushups uses `pushups:`).
export const userKey = (emailLower: string) => `politics:user:${emailLower}`;
export const userByIdKey = (userId: string) => `politics:userid:${userId}`;
export const namesKey = () => `politics:names`; // hash userId -> displayName

// Annotations
export const annotKey = (id: string) => `politics:annot:${id}`;
export const repliesKey = (annotId: string) => `politics:replies:${annotId}`; // list of Reply JSON

// Indexes (sorted sets, score = createdAt)
export const idxAll = () => `politics:annots`;
export const idxBook = (book: number) => `politics:annots:book:${book}`;
export const idxChapter = (book: number, chapter: number) => `politics:annots:chapter:${book}.${chapter}`;
export const idxTag = (tag: string) => `politics:annots:tag:${tag}`;
export const idxUser = (userId: string) => `politics:annots:user:${userId}`;
export const tagsKey = () => `politics:tags`; // sorted set tag -> count
export const authorsKey = () => `politics:authors`; // sorted set userId -> annotation count
export const prefsKey = (userId: string) => `politics:user:${userId}:prefs`; // reading prefs hash
export const notifsKey = (userId: string) => `politics:notifs:${userId}`; // list of Notification JSON, newest first
export const notifsSeenKey = (userId: string) => `politics:notifs:${userId}:seen`; // ms timestamp watermark for unread count
export const resetKey = (token: string) => `politics:reset:${token}`; // password reset token
export const tagColorsKey = () => `politics:tag-colors`; // hash tag -> color name
export const textOverridesKey = (book: number) => `politics:text-overrides:b${book}`; // hash blockId -> corrected text
export const textEditsLogKey = () => `politics:text-edits`; // list of edit-audit JSON, newest first
