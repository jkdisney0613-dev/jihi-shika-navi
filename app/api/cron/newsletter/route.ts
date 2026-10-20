// 毎週：新着記事と選び方のポイントをまとめたメルマガを Claude で作り、Resend で一斉送信する
import { NextResponse } from "next/server";
import { askJson } from "@/lib/claude";
import { checkCompliance } from "@/lib/compliance";
import { isAuthorizedCron, siteUrl } from "@/lib/cron-auth";
import { getPublishedArticles } from "@/lib/data";
import { FROM, getResend, mailFooter } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body_html"],
  properties: { subject: { type: "string" }, body_html: { type: "string" } },
};

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });

  const weekAgo = Date.now() - 7 * 86_400_000;
  const recent = (await getPublishedArticles(20)).filter((a) => new Date(a.published_at).getTime() > weekAgo);
  if (recent.length === 0) return NextResponse.json({ message: "今週の新着記事がないため送信しません" });

  const issue = await askJson<{ subject: string; body_html: string }>({
    system: `自費歯科治療を検討している読者向けの週刊メルマガを書きます。
件名は30字以内。本文は HTML（<h2><p><ul><li><a> のみ、インラインCSS可）で、600〜900字。
冒頭に今週のひとことアドバイス、次に新着記事を1本ずつ2〜3行で紹介してリンクを張り、最後に診断ページ（${siteUrl("/diagnosis")}）へ案内する。
医療広告ガイドラインを守り、「絶対」「No.1」「最安」「痛くない」などの表現や特定医院の推奨はしない。配信停止リンクと送信者情報は後から付けるので書かない。`,
    prompt: recent.map((a) => `- ${a.title}\n  ${a.description}\n  ${siteUrl(`/articles/${a.slug}`)}`).join("\n"),
    schema: SCHEMA,
  });

  const issues = checkCompliance(issue.subject + issue.body_html);
  if (issues.length > 0) {
    await db.from("newsletter_issues").insert({ subject: issue.subject, body_html: issue.body_html });
    return NextResponse.json({ message: "表現チェックに引っかかったため下書き保存のみ", issues });
  }

  const { data: saved } = await db.from("newsletter_issues").insert({ subject: issue.subject, body_html: issue.body_html }).select("id").single();
  const { data: subs } = await db.from("subscribers").select("email, token").eq("status", "active");

  // Resend の一括送信は1回100通まで。受信者ごとに配信停止リンクを差し込む
  let sent = 0;
  const list = subs ?? [];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const { error } = await getResend().batch.send(
      chunk.map((s) => {
        const unsub = siteUrl(`/api/newsletter/unsubscribe?token=${s.token}`);
        return {
          from: FROM,
          to: s.email,
          subject: issue.subject,
          html: issue.body_html + mailFooter(unsub),
          headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      }),
    );
    if (!error) sent += chunk.length;
  }

  await db.from("newsletter_issues").update({ sent_count: sent, sent_at: new Date().toISOString() }).eq("id", saved!.id);
  await db.from("routine_runs").insert({ routine: "newsletter", status: sent === list.length ? "success" : "partial", summary: { subject: issue.subject, sent, total: list.length }, finished_at: new Date().toISOString() });
  return NextResponse.json({ subject: issue.subject, sent, total: list.length });
}
