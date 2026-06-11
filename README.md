# Politics

The complete text of **Aristotle's _Politics_** in **Benjamin Jowett's** translation —
read passage by passage, highlight any sentence, and leave notes, questions, and glosses.
Comments thread; everything is browsable by book & chapter, by tag, and by author.

Live at **[politics.grannis.xyz](https://politics.grannis.xyz)**.

## Stack

- **Next.js 15** (App Router) + React 19, hand-written CSS (two reading surfaces: dark "ink" and parchment "sepia")
- **Upstash Redis** for users, annotations, replies, and indexes (all under the `politics:` namespace)
- **jose** JWT sessions + scrypt password hashing (no external auth dependency)
- Deployed on **Vercel**

## How it works

- **Text** — `data/politics.json`: 8 books → chapters → numbered paragraphs ("blocks"), each with a
  stable id like `b1.c1.p1`. Built from the public-domain Jowett translation
  (Internet Classics Archive). Bekker page-ranges are shown per book; precise citation uses
  **Book · Chapter · ¶** (e.g. `I.2.5`), since true line-level Bekker numbers are keyed to the
  Greek and can't be placed in an English prose translation.
- **Annotations** — a highlight is one or more *anchors* (`{blockId, start, end}`) plus a root
  comment, tags, and a threaded reply list. Anchors are validated against the real text on the
  server. Highlights render by splitting each block's text at annotation boundaries into `<mark>`
  segments.
- **Browse** — sorted-set indexes per book, chapter, tag, and author give instant filtered views.

## Develop

```bash
npm install
# .env.local needs: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, AUTH_SECRET
npm run dev
```

## Text provenance

Jowett's translation is in the public domain. Source: The Internet Classics Archive
(classics.mit.edu). Light cleanup only — paragraphing and citation structure preserved.
