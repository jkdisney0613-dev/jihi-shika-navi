// 質問への回答（経験者・検討中の人）。専門家の回答は管理画面から書く
import { NextResponse } from "next/server";
import { AGE_BANDS, ANSWERER_STAGES, communityDb, hashIp, moderate, statusFor, tooMany } from "@/lib/community";

export async function POST(req: Request) {
  const db = communityDb();
  if (!db) return NextResponse.json({ error: "ただいま準備中のため、回答はまだ受け付けていません" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const questionId = typeof b.question_id === "string" && /^[0-9a-f-]{36}$/.test(b.question_id) ? b.question_id : null;
  const stage = ANSWERER_STAGES.find((s) => s === b.stage);
  const age = AGE_BANDS.find((a) => a === b.age_band);
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 800) : "";
  if (!questionId || !stage || body.length < 5) return NextResponse.json({ error: "立場と回答（5文字以上）を入力してください" }, { status: 400 });
  if (b.agree !== true) return NextResponse.json({ error: "投稿ルールへの同意が必要です" }, { status: 400 });

  const { data: q } = await db.from("community_questions").select("id").eq("id", questionId).eq("status", "published").maybeSingle();
  if (!q) return NextResponse.json({ error: "質問が見つかりません" }, { status: 404 });
  const ipHash = hashIp(req);
  if (await tooMany("community_answers", ipHash, 10)) return NextResponse.json({ error: "今日の回答数の上限に達しました。また明日お願いします" }, { status: 429 });

  const flags = await moderate(body);
  const status = statusFor(flags);
  const { error } = await db.from("community_answers").insert({
    question_id: questionId, author_label: age ? `${stage}・${age}` : stage, body, status, flags, ip_hash: ipHash,
  });
  if (error) return NextResponse.json({ error: "保存できませんでした。時間をおいてお試しください" }, { status: 500 });
  return NextResponse.json({ status });
}
