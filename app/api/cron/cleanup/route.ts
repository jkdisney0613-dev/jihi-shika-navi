// 月次タスク：プライバシーポリシーどおり、1年を過ぎたオンライン相談の写真を消す
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });

  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { data: old } = await db.from("consultations").select("id, photo_paths").lt("created_at", yearAgo).neq("photo_paths", "{}");
  let removed = 0;
  const errors: string[] = [];
  for (const c of old ?? []) {
    const { error } = await db.storage.from("consult-photos").remove(c.photo_paths);
    if (error) errors.push(`${c.id}: ${error.message}`);
    else {
      await db.from("consultations").update({ photo_paths: [] }).eq("id", c.id);
      removed++;
    }
  }

  await db.from("routine_runs").insert({ routine: "cleanup", status: errors.length ? "partial" : "success", summary: { removed, errors }, finished_at: new Date().toISOString() });
  return NextResponse.json({ removed, errors });
}
