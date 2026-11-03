import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, isAdminKey } from "@/lib/admin-auth";
import { hashIp } from "@/lib/community";
import { rateLimited } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // 鍵の総当たり対策：同じ IP からは 15 分に 10 回まで
  if (rateLimited(`admin-login:${hashIp(req)}`, 10, 15 * 60_000)) {
    return new NextResponse("試行回数が多すぎます。しばらくしてからお試しください", { status: 429 });
  }
  const key = String((await req.formData()).get("key") ?? "");
  const res = NextResponse.redirect(new URL("/admin/community", req.url), 303);
  if (isAdminKey(key)) {
    res.cookies.set(ADMIN_COOKIE, adminCookieValue(key), { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
