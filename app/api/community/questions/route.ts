// 質問ひろばへの質問の投稿
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/cron-auth";
import { esc } from "@/lib/consult-mail";
import { FROM, getResend } from "@/lib/resend";
import { COMMUNITY_OPTIONS, TOPICS, communityDb, hashIp, moderate, statusFor, tooMany } from "@/lib/community";

export async function POST(req: Request) {
  const db = communityDb();
  if (!db) return NextResponse.json({ error: "ただいま準備中のため、質問はまだ受け付けていません" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const topic = typeof b.topic === "string" && b.topic in TOPICS ? b.topic : null;
  const option = COMMUNITY_OPTIONS.find((o) => o.value === b.option_code)?.value ?? null;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 600) : "";
  if (!topic || title.length < 5) return NextResponse.json({ error: "種類と質問（5文字以上）を入力してください" }, { status: 400 });
  if (b.agree !== true) return NextResponse.json({ error: "投稿ルールへの同意が必要です" }, { status: 400 });

  const ipHash = hashIp(req);
  if (await tooMany("community_questions", ipHash, 3)) return NextResponse.json({ error: "今日の質問数の上限に達しました。また明日お願いします" }, { status: 429 });

  const flags = await moderate(`${title}\n${body}`);
  const status = statusFor(flags);
  const { data, error } = await db.from("community_questions")
    .insert({ topic, option_code: option, title, body, status, flags, ip_hash: ipHash }).select("id").single();
  if (error) return NextResponse.json({ error: "保存できませんでした。時間をおいてお試しください" }, { status: 500 });
  // 専門家がすぐ答えられるよう運営に知らせる（立ち上げ直後は回答の速さがいちばん大事）
  if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    await getResend().emails.send({
      from: FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `【質問ひろば】新しい質問${status === "pending" ? "（確認待ち）" : ""}：${title.slice(0, 30)}`,
      html: `<p><b>${esc(title)}</b></p><p style="white-space:pre-wrap">${esc(body)}</p>${flags.length ? `<p>保留の理由：${esc(flags.join("、"))}</p>` : ""}<p><a href="${siteUrl("/admin/community")}">管理画面で確認・回答する</a></p>`,
    }).catch(() => null);
  }
  return NextResponse.json({ status, id: data.id });
}
