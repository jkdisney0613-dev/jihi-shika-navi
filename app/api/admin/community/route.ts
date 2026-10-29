// 管理画面からの操作：投稿の公開・非公開、専門家としての回答
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { EXPERT_ROLES, communityDb } from "@/lib/community";

const TABLES = ["community_experiences", "community_questions", "community_answers"] as const;

export async function POST(req: Request) {
  const back = NextResponse.redirect(new URL("/admin/community", req.url), 303);
  if (!(await isAdmin())) return back;
  const db = communityDb();
  if (!db) return back;
  const f = await req.formData();
  const action = String(f.get("action") ?? "");

  if (action === "publish" || action === "reject") {
    const table = TABLES.find((t) => t === f.get("table"));
    const id = String(f.get("id") ?? "");
    if (table && /^[0-9a-f-]{36}$/.test(id)) {
      await db.from(table).update({ status: action === "publish" ? "published" : "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    }
  }

  if (action === "answer") {
    const questionId = String(f.get("question_id") ?? "");
    const role = String(f.get("role") ?? "") in EXPERT_ROLES ? String(f.get("role")) : "dental_hygienist";
    const name = String(f.get("name") ?? "").trim().slice(0, 30) || process.env.EXPERT_NAME || "歯科衛生士";
    const body = String(f.get("body") ?? "").trim().slice(0, 800);
    if (/^[0-9a-f-]{36}$/.test(questionId) && body.length >= 5) {
      await db.from("community_answers").insert({
        question_id: questionId, is_expert: true, expert_role: role, author_label: name, body, status: "published", reviewed_at: new Date().toISOString(),
      });
      // 専門家が答えた質問は、まだ確認待ちでも公開する
      await db.from("community_questions").update({ status: "published", reviewed_at: new Date().toISOString() }).eq("id", questionId).eq("status", "pending");
    }
  }
  return back;
}
