// 毎日：検索語キューから1本、自社の医院・価格データに基づく記事を生成する
// 医療広告ガイドラインに触れる表現が見つかった記事、または AUTO_PUBLISH_ARTICLES が true でない場合は下書きに残す
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { askJson } from "@/lib/claude";
import { PRICE_DISCLAIMER, checkCompliance } from "@/lib/compliance";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getPublishedClinics, priceStats } from "@/lib/data";
import { OPTIONS, formatPrice } from "@/lib/options";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { TreatmentCategory } from "@/lib/types";

export const maxDuration = 300;

interface Draft {
  slug: string;
  title: string;
  description: string;
  body_md: string;
  faq: { q: string; a: string }[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["slug", "title", "description", "body_md", "faq"],
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    body_md: { type: "string" },
    faq: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["q", "a"], properties: { q: { type: "string" }, a: { type: "string" } } },
    },
  },
};

const SYSTEM = `あなたは歯科の自費診療に詳しい編集者です。患者が治療と医院を選ぶための、中立で正確な日本語の記事を書きます。
検索エンジンにも、ChatGPT や Claude などの AI 検索にも引用されやすいように次を守ってください。
- 冒頭3文で検索語への答え（費用の目安・期間・向いている人）を言い切る。
- 見出し（##）は検索者の疑問の形にする。表で費用を比較する。
- 「当サイト調べ」として渡された価格データを必ず使い、件数と調査時点を明記する。データにない数字は作らない。
- メリットだけでなくリスク・副作用・注意点を必ず書く。
- 医療広告ガイドラインを守る：「絶対」「必ず」「No.1」「最安」「痛くない」など効果保証・比較優良・誇大表現を使わない。特定医院を名指しで推奨しない。
- 最後に「医院選びのチェックリスト」と診断ページ（/diagnosis）への案内を入れる。
- slug は半角英小文字とハイフンだけ。title は32字前後、description は120字以内。faq は4〜6問。`;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });

  const { data: next } = await db.from("keyword_queue").select("*").is("done_at", null)
    .order("priority", { ascending: false }).limit(1).maybeSingle();
  if (!next) return NextResponse.json({ message: "キューが空です" });

  // 自社データ（独自性のある一次情報）を記事に渡す
  const clinics = await getPublishedClinics();
  let dataNote = "（価格データなし）";
  if (next.category) {
    const cat = next.category as TreatmentCategory;
    const stats = priceStats(clinics, cat, next.prefecture ?? undefined);
    const lines = [...stats.byOption].map(([code, s]) => {
      const label = OPTIONS[cat].find((o) => o.value === code)?.label ?? code;
      return `- ${label}：${formatPrice(s.min)}〜${formatPrice(s.max)}（${s.count}院）`;
    });
    dataNote = `当サイト調べ（${new Date().toISOString().slice(0, 7)}時点、${next.prefecture ?? "全国"}の掲載${stats.clinicCount}院）\n${lines.join("\n")}`;
  }

  const draft = await askJson<Draft>({
    system: SYSTEM,
    prompt: `検索語：${next.keyword}\n\n${dataNote}`,
    schema: SCHEMA,
    effort: "high",
  });

  const body = `${draft.body_md}\n\n${PRICE_DISCLAIMER}`;
  const issues = checkCompliance([draft.title, draft.description, body, ...draft.faq.map((f) => f.q + f.a)].join("\n"));
  const publish = process.env.AUTO_PUBLISH_ARTICLES === "true" && issues.length === 0;
  const slug = draft.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `article-${Date.now()}`;

  const { error } = await db.from("articles").upsert({
    slug, title: draft.title, description: draft.description, keyword: next.keyword,
    category: next.category, prefecture: next.prefecture, body_md: body, faq: draft.faq,
    compliance_issues: issues, status: publish ? "published" : "draft",
    published_at: publish ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
  }, { onConflict: "slug" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("keyword_queue").update({ done_at: new Date().toISOString() }).eq("keyword", next.keyword);
  if (publish) {
    revalidatePath(`/articles/${slug}`);
    revalidatePath("/articles");
    revalidatePath("/sitemap.xml");
  }
  const summary = { keyword: next.keyword, slug, status: publish ? "published" : "draft", issues };
  await db.from("routine_runs").insert({ routine: "articles", status: "success", summary, finished_at: new Date().toISOString() });
  return NextResponse.json(summary);
}
