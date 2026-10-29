// 「参考になった」「同じ悩み」ボタン。同じ人は1つの投稿に1回だけ
import { NextResponse } from "next/server";
import { communityDb, hashIp } from "@/lib/community";

const TARGETS = { experience: "experience_id", question: "question_id", answer: "answer_id" } as const;

export async function POST(req: Request) {
  const db = communityDb();
  if (!db) return NextResponse.json({ ok: true }); // 見本表示中は数えない
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const column = typeof b.target === "string" ? TARGETS[b.target as keyof typeof TARGETS] : undefined;
  const id = typeof b.id === "string" && /^[0-9a-f-]{36}$/.test(b.id) ? b.id : null;
  if (!column || !id) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { error } = await db.from("community_reactions").insert({ [column]: id, ip_hash: hashIp(req) });
  // 2回目（一意制約の違反）は成功扱い
  if (error && error.code !== "23505") return NextResponse.json({ error: "保存できませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
