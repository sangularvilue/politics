import { redis, resetKey } from "./redis";

export interface ResetRecord { uid: string; exp: number }

/** Read a reset token; valid only if it exists and the embedded exp hasn't passed. */
export async function readReset(token: string): Promise<ResetRecord | null> {
  if (!token) return null;
  const rec = await redis.get<ResetRecord | string>(resetKey(token));
  if (!rec || typeof rec === "string") return null;
  if (!rec.uid || typeof rec.exp !== "number" || Date.now() > rec.exp) return null;
  return rec;
}
