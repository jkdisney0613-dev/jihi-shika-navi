// PR枠の申込み：申込み内容を保存し、Stripe の決済リンク（月額）へ申込みIDを付けて送る
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const form = await req.formData();
  const clinicName = String(form.get("clinic_name") ?? "").trim();
  const email = String(form.get("contact_email") ?? "").trim();
  if (!clinicName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "医院名とメールアドレスを入力してください" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const link = process.env.STRIPE_SPONSOR_PAYMENT_LINK; // 例: https://buy.stripe.com/xxxx
  if (!db || !link) return NextResponse.json({ error: "現在お申込みを受け付けていません" }, { status: 503 });

  // 登録済み医院なら紐づける（公式サイトURLで照合）
  const website = String(form.get("website_url") ?? "").trim() || null;
  const { data: clinic } = website
    ? await db.from("clinics").select("id").eq("website_url", website).maybeSingle()
    : { data: null };

  const { data, error } = await db
    .from("sponsorships")
    .insert({
      clinic_id: clinic?.id ?? null,
      clinic_name: clinicName,
      contact_email: email,
      website_url: website,
      prefecture: String(form.get("prefecture") ?? "") || null,
      message: String(form.get("message") ?? "").slice(0, 1000) || null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "申込みを保存できませんでした" }, { status: 500 });

  // Payment Link は client_reference_id と prefilled_email をURLで受け取れる。Webhook で申込みと決済を突き合わせる
  const url = new URL(link);
  url.searchParams.set("client_reference_id", data.id);
  url.searchParams.set("prefilled_email", email);
  return NextResponse.redirect(url.toString(), 303);
}
