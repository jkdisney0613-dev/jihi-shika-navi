import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, isAdminKey } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const key = String((await req.formData()).get("key") ?? "");
  const res = NextResponse.redirect(new URL("/admin/community", req.url), 303);
  if (isAdminKey(key)) {
    res.cookies.set(ADMIN_COOKIE, adminCookieValue(key), { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
