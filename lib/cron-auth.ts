import { createHash, timingSafeEqual } from "node:crypto";

// Vercel Cron からの呼び出しだけを通す（Vercel は Authorization: Bearer $CRON_SECRET を付けて呼ぶ）
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // 長さや内容で比較時間が変わらないよう、ハッシュにそろえて定数時間で比べる
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(req.headers.get("authorization") ?? ""), h(`Bearer ${secret}`));
}

export function siteUrl(path = ""): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}
