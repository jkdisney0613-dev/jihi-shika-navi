// 管理画面のかんたんな鍵。ADMIN_KEY を知っている人だけが入れる（cookie にはハッシュだけを置く）
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "jihi_admin";
const digest = (s: string) => createHash("sha256").update(`admin:${s}`).digest("hex");

export const adminCookieValue = (key: string) => digest(key);

export function isAdminKey(key: string) {
  const expected = process.env.ADMIN_KEY;
  if (!expected || expected.length < 12) return false;
  const a = Buffer.from(digest(key)), b = Buffer.from(digest(expected));
  return timingSafeEqual(a, b);
}

export async function isAdmin() {
  const expected = process.env.ADMIN_KEY;
  if (!expected || expected.length < 12) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const a = Buffer.from(v.padEnd(64, "0").slice(0, 64)), b = Buffer.from(digest(expected));
  return timingSafeEqual(a, b);
}
