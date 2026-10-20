import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const db = getSupabaseAdmin();
  if (token && db) {
    await db.from("subscribers").update({ status: "active", confirmed_at: new Date().toISOString() }).eq("token", token).eq("status", "pending");
  }
  return NextResponse.redirect(siteUrl("/articles?subscribed=1"));
}
