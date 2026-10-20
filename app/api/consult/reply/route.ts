// POST /api/consult/reply：医院からの概算返信を保存し、患者さんにメールで届ける
import { NextResponse } from "next/server";
import { checkCompliance } from "@/lib/compliance";
import { REPLY_TTL_DAYS, hashToken, patientReplyHtml } from "@/lib/consult-mail";
import { siteUrl } from "@/lib/cron-auth";
import { FROM, getResend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const min = Number(form.get("reply_min"));
  const max = Number(form.get("reply_max"));
  const plan = String(form.get("reply_plan") ?? "").trim().slice(0, 100) || null;
  const message = String(form.get("reply_message") ?? "").trim().slice(0, 800) || null;
  // エラーは返信画面に戻して表示する
  const back = (error: string) => NextResponse.redirect(siteUrl(`/clinic/reply/${token}?error=${encodeURIComponent(error)}`), 303);
  if (!token) return NextResponse.json({ error: "invalid token" }, { status: 400 });
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1000 || max < min || max > 10_000_000) {
    return back("概算の金額を確認してください（下限 ≦ 上限）");
  }
  // 効果の保証など、医療広告ガイドラインで問題になりやすい表現は送らずに差し戻す
  const issues = checkCompliance(`${plan ?? ""}\n${message ?? ""}`);
  if (issues.length) return back(`次の表現は患者さまに送れません。言い換えてください：${issues.join(" / ")}`);

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "現在ご利用いただけません" }, { status: 503 });

  const { data: r } = await db
    .from("consultation_requests")
    .select("id, status, created_at, clinics(name), doctors(name), consultations(name, email)")
    .eq("reply_token_hash", hashToken(token))
    .maybeSingle();
  if (!r || Date.now() - new Date(r.created_at).getTime() > REPLY_TTL_DAYS * 86_400_000) {
    return NextResponse.json({ error: "このリンクは無効か、期限が過ぎています" }, { status: 404 });
  }
  if (r.status !== "sent") return NextResponse.redirect(siteUrl(`/clinic/reply/${token}?sent=1`), 303);

  // status = 'sent' のときだけ更新し、二重送信でメールが2通届かないようにする
  const { data: updated } = await db
    .from("consultation_requests")
    .update({ status: "replied", reply_min: min, reply_max: max, reply_plan: plan, reply_message: message, replied_at: new Date().toISOString() })
    .eq("id", r.id)
    .eq("status", "sent")
    .select("id");
  if (updated?.length) {
    const c = r.consultations as unknown as { name: string; email: string };
    await getResend().emails.send({
      from: FROM,
      to: c.email,
      subject: `【自費歯科ナビ】${(r.clinics as unknown as { name: string }).name}から概算が届きました`,
      html: patientReplyHtml({
        name: c.name,
        clinicName: (r.clinics as unknown as { name: string }).name,
        doctorName: (r.doctors as unknown as { name: string } | null)?.name ?? null,
        min,
        max,
        plan,
        message,
        bookingUrl: siteUrl(`/api/consult/book/${r.id}`),
      }),
    });
  }
  return NextResponse.redirect(siteUrl(`/clinic/reply/${token}?sent=1`), 303);
}
