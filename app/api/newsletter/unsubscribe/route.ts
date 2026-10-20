// 配信停止：メール本文のリンク（GET）と、Gmail 等のワンクリック配信停止（POST, RFC 8058）の両方に対応
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

async function unsubscribe(token: string | null) {
  const db = getSupabaseAdmin();
  if (!token || !db) return;
  await db.from("subscribers").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("token", token);
}

export async function GET(req: Request) {
  await unsubscribe(new URL(req.url).searchParams.get("token"));
  return new Response("<p style='font-family:sans-serif;padding:40px'>配信を停止しました。ご利用ありがとうございました。</p>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  await unsubscribe(new URL(req.url).searchParams.get("token"));
  return NextResponse.json({ ok: true });
}
