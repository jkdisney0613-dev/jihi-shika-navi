// 医院からの「情報の修正・掲載停止」の依頼。掲載停止はその場で非公開にし、運営に通知する
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/cron-auth";
import { esc } from "@/lib/consult-mail";
import { FROM, getResend } from "@/lib/resend";
import { REAL_CLINICS } from "@/lib/real-clinics";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const form = await req.formData();
  const slug = String(form.get("clinic_slug") ?? "").trim().slice(0, 100);
  const clinicName = String(form.get("clinic_name") ?? "").trim().slice(0, 100);
  const kind = form.get("kind") === "remove" ? "remove" : "correct";
  const requester = String(form.get("requester") ?? "").trim().slice(0, 100);
  const email = String(form.get("contact_email") ?? "").trim().slice(0, 200);
  const message = String(form.get("message") ?? "").trim().slice(0, 2000);
  if (!clinicName || !requester || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "医院名・ご担当者名・メールアドレスを入力してください" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "現在受け付けできません。お手数ですがサイト運営者へメールでご連絡ください" }, { status: 503 });

  let { data: clinic } = slug ? await db.from("clinics").select("id").eq("slug", slug).maybeSingle() : { data: null };
  // lib/real-clinics.ts にだけある医院は、掲載停止のときに DB へ非公開の行を作って表示から外す
  const fromCode = !clinic && kind === "remove" ? REAL_CLINICS.find((c) => c.slug === slug) : undefined;
  if (fromCode) {
    const { data: inserted } = await db.from("clinics").insert({
      id: fromCode.id, slug: fromCode.slug, station_slug: fromCode.station_slug, name: fromCode.name, address: fromCode.address,
      prefecture: fromCode.prefecture, city: fromCode.city, nearest_station: fromCode.nearest_station, walk_minutes: fromCode.walk_minutes,
      features: fromCode.features, catch_copy: fromCode.catch_copy, website_url: fromCode.website_url,
      source: "manual", researched_at: fromCode.verified_at, is_published: false,
    }).select("id").single();
    clinic = inserted;
  }
  const { error } = await db.from("clinic_change_requests").insert({
    clinic_id: clinic?.id ?? null, clinic_name: clinicName, kind, requester, contact_email: email, message,
  });
  if (error) return NextResponse.json({ error: "依頼を保存できませんでした" }, { status: 500 });

  // 掲載停止は確認を待たずに非公開にする（なりすましの可能性は運営が後から確認する）
  if (kind === "remove" && clinic) await db.from("clinics").update({ is_published: false }).eq("id", clinic.id);

  const resend = getResend();
  if (process.env.ADMIN_EMAIL) {
    await resend.emails.send({
      from: FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `【要対応】医院から${kind === "remove" ? "掲載停止" : "情報修正"}の依頼：${clinicName}`,
      html: `<p>${esc(clinicName)}（${esc(slug || "医院ページ不明")}）<br/>${esc(requester)}／${esc(email)}</p><p style="white-space:pre-wrap">${esc(message || "（本文なし）")}</p><p>${kind === "remove" && clinic ? "掲載は自動で非公開にしました。" : "内容を確認し、3営業日以内に反映・返信してください。"}</p>`,
    });
  }
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "【自費歯科ナビ】ご依頼を受け付けました",
    html: `<p>${esc(clinicName)} ${esc(requester)} 様</p><p>${kind === "remove" ? "掲載停止のご依頼を受け付け、医院ページを非公開にしました。" : "情報修正のご依頼を受け付けました。3営業日以内に確認して反映します。"}</p>`,
  });
  return NextResponse.redirect(siteUrl(`/for-clinics/request?sent=${kind}`), 303);
}
