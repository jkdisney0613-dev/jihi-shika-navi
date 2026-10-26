// 医院向け：オンライン相談の受付（無料）の申込み。運営が内容を確認してから有効にする
// 相談1件ごとの料金は療担規則の「患者紹介の対価」にあたるおそれがあるため取らない
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/cron-auth";
import { esc } from "@/lib/consult-mail";
import { FROM, getResend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const form = await req.formData();
  const clinicName = String(form.get("clinic_name") ?? "").trim().slice(0, 100);
  const email = String(form.get("contact_email") ?? "").trim().slice(0, 200);
  const website = String(form.get("website_url") ?? "").trim().slice(0, 300) || null;
  const doctors = String(form.get("doctors") ?? "").trim().slice(0, 2000);
  if (!clinicName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !doctors) {
    return NextResponse.json({ error: "医院名・メールアドレス・担当医を入力してください" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "現在お申込みを受け付けていません" }, { status: 503 });

  const { data: clinic } = website ? await db.from("clinics").select("id").eq("website_url", website).maybeSingle() : { data: null };
  const { error } = await db.from("clinic_partners").insert({
    clinic_id: clinic?.id ?? null,
    clinic_name: clinicName,
    contact_email: email,
    website_url: website,
    plan: "free",
    lead_price: 0,
  });
  if (error) return NextResponse.json({ error: "申込みを保存できませんでした" }, { status: 500 });

  const resend = getResend();
  if (process.env.ADMIN_EMAIL) {
    await resend.emails.send({
      from: FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `【要確認】オンライン相談の申込み：${clinicName}`,
      html: `<p>${esc(clinicName)}（${esc(email)}）<br/>${esc(website ?? "サイトURLなし")}</p><p style="white-space:pre-wrap">担当医：\n${esc(doctors)}</p><p>資格表記を確認し、doctors に登録して clinic_partners.status を active にすると相談先に表示されます。</p>`,
    });
  }
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "【自費歯科ナビ】オンライン相談のお申込みを受け付けました",
    html: `<p>${esc(clinicName)} ご担当者様</p><p>お申込みありがとうございます。担当医の情報を確認のうえ、掲載開始をご連絡します。</p>`,
  });
  return NextResponse.redirect(siteUrl("/for-clinics?applied=consult"), 303);
}
