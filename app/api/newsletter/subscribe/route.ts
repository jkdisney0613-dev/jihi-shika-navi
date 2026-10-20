// メルマガ登録（ダブルオプトイン：確認メールのリンクを押した人だけに配信する）
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/cron-auth";
import { FROM, getResend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; interest?: string; prefecture?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "メールアドレスを確認してください" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "現在登録できません" }, { status: 503 });

  const { data: existing } = await db.from("subscribers").select("status, token").eq("email", email).maybeSingle();
  if (existing?.status === "active") return NextResponse.json({ ok: true });

  const { data, error } = await db
    .from("subscribers")
    .upsert({ email, interest: body.interest ?? null, prefecture: body.prefecture ?? null, status: "pending" }, { onConflict: "email" })
    .select("token")
    .single();
  if (error) return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });

  // メール未設定（テスト公開中）は確認待ちのまま記録だけする。確認していない人には配信しない
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: true });

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "【自費歯科ナビ】メールアドレスの確認",
    html: `<p>自費歯科ナビのメールマガジンにご登録いただきありがとうございます。</p>
<p>下のボタンを押すと登録が完了し、自費診療の選び方ガイドをお届けします。</p>
<p><a href="${siteUrl(`/api/newsletter/confirm?token=${data.token}`)}" style="display:inline-block;padding:12px 24px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none">登録を完了する</a></p>
<p style="font-size:12px;color:#6b7280">心当たりがない場合はこのメールを破棄してください。</p>`,
  });
  return NextResponse.json({ ok: true });
}
