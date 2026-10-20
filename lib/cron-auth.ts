// Vercel Cron からの呼び出しだけを通す（Vercel は Authorization: Bearer $CRON_SECRET を付けて呼ぶ）
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export function siteUrl(path = ""): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}
