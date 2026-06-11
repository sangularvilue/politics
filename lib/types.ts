// ---- Text model (static, from data/politics.json) ----
export interface Block {
  id: string;   // e.g. "b1.c1.p1"
  n: number;    // paragraph number within chapter
  text: string;
}
export interface Chapter {
  chapter: number;
  blocks: Block[];
}
export interface Book {
  book: number;
  title: string;   // "Book I"
  theme: string;   // editorial nav subtitle
  bekker: string;  // "1252a–1260b"
  chapters: Chapter[];
}
export interface Politics {
  meta: {
    work: string; author: string; translator: string; source: string; note: string;
  };
  books: Book[];
}

// ---- Users ----
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
}

// ---- Annotations ----
/** A text anchor: a half-open character range [start,end) within one block. */
export interface Anchor {
  blockId: string;
  start: number;
  end: number;
}

export interface Annotation {
  id: string;
  userId: string;
  authorName: string;
  book: number;
  chapter: number;
  /** Ordered anchors covering the (possibly multi-paragraph) selection. */
  anchors: Anchor[];
  /** The exact quoted text the user selected. */
  quote: string;
  /** The root comment body. */
  body: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  editedAt?: number;
  replyCount: number;
}

export interface Reply {
  id: string;
  annotationId: string;
  userId: string;
  authorName: string;
  body: string;
  /** null for a top-level reply, else the Reply.id being responded to. */
  parentId: string | null;
  createdAt: number;
  editedAt?: number;
}

/** Annotation plus its thread, returned to the client. */
export interface AnnotationThread extends Annotation {
  replies: Reply[];
}
