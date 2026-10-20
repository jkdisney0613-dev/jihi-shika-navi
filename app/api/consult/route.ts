// POST /api/consult：オンライン相談を受け付け、選ばれた医院（最大3院）へ届ける
// 届けた相談は1件ごとに医院へ課金する（月末に /api/cron/billing がまとめて請求）
import { NextResponse } from "next/server";
import { CONCERNS, MAX_CLINICS_PER_CONSULT, MAX_PHOTOS, estimate, type Concern } from "@/lib/consult";
import { getConsultClinics } from "@/lib/consult-data";
import { REPLY_TTL_DAYS, clinicNoticeHtml, newReplyToken, patientReceiptHtml, range } from "@/lib/consult-mail";
import { siteUrl } from "@/lib/cron-auth";
import { OPTIONS, PRIORITIES } from "@/lib/options";
import { FROM, getResend } from "@/lib/resend";
import { DEMO_MODE } from "@/lib/demo";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { TreatmentOption } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHOTO_PATH = /^pending\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;
const AGE_RANGES = ["10代", "20代", "30代", "40代", "50代以上"];
const ALL_OPTIONS = Object.values(OPTIONS).flat().map((o) => o.value);

interface Pick {
  clinicId: string;
  doctorId: string | null;
}

function parse(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const concern = b.concern as Concern;
  const option = b.option as TreatmentOption;
  const name = str(b.name, 50);
  const email = str(b.email, 200);
  const picks = Array.isArray(b.picks) ? (b.picks as Pick[]) : [];
  const photoPaths = Array.isArray(b.photoPaths) ? (b.photoPaths as string[]) : [];
  const wishes = Array.isArray(b.wishes) ? (b.wishes as string[]) : [];

  if (!CONCERNS.some((c) => c.value === concern)) return null;
  if (!ALL_OPTIONS.includes(option)) return null;
  if (!name || !EMAIL.test(email)) return null;
  if (b.consent !== true) return null;
  if (picks.length < 1 || picks.length > MAX_CLINICS_PER_CONSULT) return null;
  if (!picks.every((p) => typeof p?.clinicId === "string" && (p.doctorId == null || typeof p.doctorId === "string"))) return null;
  if (new Set(picks.map((p) => p.clinicId)).size !== picks.length) return null;
  if (photoPaths.length > MAX_PHOTOS || !photoPaths.every((p) => typeof p === "string" && PHOTO_PATH.test(p))) return null;
  if (!wishes.every((w) => PRIORITIES.some((p) => p.label === w))) return null;
  if (b.budgetMax != null && (typeof b.budgetMax !== "number" || b.budgetMax <= 0)) return null;
  const ageRange = AGE_RANGES.includes(b.ageRange as string) ? (b.ageRange as string) : null;

  return {
    concern,
    option,
    name,
    email,
    ageRange,
    picks,
    photoPaths,
    wishes,
    budgetMax: (b.budgetMax as number | null) ?? null,
    note: str(b.note, 1000) || null,
    utm: (b.utm ?? {}) as Record<string, string | undefined>,
  };
}

export async function POST(req: Request) {
  const input = parse(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });

  const all = await getConsultClinics();
  const targets = input.picks.map((p) => {
    const cc = all.find((c) => c.clinic.id === p.clinicId);
    const doctor = cc?.doctors.find((d) => d.id === p.doctorId) ?? null;
    return cc && (p.doctorId == null || doctor) ? { ...cc, doctor } : null;
  });
  if (targets.some((t) => !t)) return NextResponse.json({ error: "選んだ医院が見つかりません。もう一度選んでください" }, { status: 400 });
  const chosen = targets.filter((t) => t !== null);

  const est = estimate(input.concern, chosen.map((t) => t.clinic)).find((e) => e.option === input.option);
  const estimateText = est ? range(est.min, est.max) : "医院からの返信をお待ちください";

  const db = getSupabaseAdmin();
  // Supabase 未設定（デモ）のときは保存・送信せずに受付画面だけ出す
  if (!db) return NextResponse.json({ ok: true, demo: true });

  // テスト公開中は医院に送らず、需要の記録としてだけ残す（写真は受け付けない）
  if (DEMO_MODE) {
    const { error } = await db.from("consult_interest").insert({
      email: input.email,
      age_range: input.ageRange,
      concern: input.concern,
      option: input.option,
      budget_max: input.budgetMax,
      clinic_ids: chosen.map((t) => t.clinic.id),
      wishes: input.wishes,
      note: input.note,
      utm_source: input.utm.source ?? null,
      utm_medium: input.utm.medium ?? null,
      utm_campaign: input.utm.campaign ?? null,
    });
    if (error) return NextResponse.json({ error: "送信できませんでした" }, { status: 500 });
    return NextResponse.json({ ok: true, demo: true });
  }

  const { data: consultation, error } = await db
    .from("consultations")
    .insert({
      name: input.name,
      email: input.email,
      age_range: input.ageRange,
      concern: input.concern,
      option: input.option,
      budget_max: input.budgetMax,
      wishes: input.wishes,
      note: input.note,
      photo_paths: input.photoPaths,
      estimate_min: est?.min ?? null,
      estimate_max: est?.max ?? null,
      consent_at: new Date().toISOString(),
      utm_source: input.utm.source ?? null,
      utm_medium: input.utm.medium ?? null,
      utm_campaign: input.utm.campaign ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "相談を保存できませんでした" }, { status: 500 });

  // 医院が写真を見るための期限つきURL（7日）
  const photoUrls: string[] = [];
  for (const path of input.photoPaths) {
    const { data } = await db.storage.from("consult-photos").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (data) photoUrls.push(data.signedUrl);
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const resend = getResend();
  for (const t of chosen) {
    // 同じ人から同じ医院への相談は30日に1件だけ課金する
    const { count } = await db
      .from("consultation_requests")
      .select("id, consultations!inner(email)", { count: "exact", head: true })
      .eq("clinic_id", t.clinic.id)
      .eq("consultations.email", input.email)
      .gte("created_at", since);

    const { token, hash } = newReplyToken();
    const { error: re } = await db.from("consultation_requests").insert({
      consultation_id: consultation.id,
      clinic_id: t.clinic.id,
      partner_id: t.partnerId,
      doctor_id: t.doctor?.id ?? null,
      reply_token_hash: hash,
      billable: !count,
      lead_price: t.leadPrice,
    });
    if (re) {
      console.error("[consult] failed to save request", re);
      continue;
    }

    const { data: partner } = await db.from("clinic_partners").select("contact_email").eq("id", t.partnerId).single();
    if (!partner) continue;
    await resend.emails.send({
      from: FROM,
      to: partner.contact_email,
      subject: `【自費歯科ナビ】オンライン相談が届きました（${t.doctor ? `${t.doctor.name}先生ご指名` : "担当医の指定なし"}）`,
      html: clinicNoticeHtml({
        clinicName: t.clinic.name,
        doctorName: t.doctor?.name ?? null,
        patientName: input.name,
        ageRange: input.ageRange,
        concern: input.concern,
        option: input.option,
        budgetMax: input.budgetMax,
        wishes: input.wishes,
        note: input.note,
        photoUrls,
        replyUrl: siteUrl(`/clinic/reply/${token}`),
      }),
    });
  }

  await resend.emails.send({
    from: FROM,
    to: input.email,
    subject: "【自費歯科ナビ】オンライン相談を受け付けました",
    html: patientReceiptHtml({
      name: input.name,
      clinics: chosen.map((t) => ({ name: t.clinic.name, doctor: t.doctor?.name ?? null })),
      estimate: estimateText,
    }),
  });

  return NextResponse.json({ ok: true, replyDays: REPLY_TTL_DAYS });
}
