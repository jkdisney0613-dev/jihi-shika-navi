// /llms.txt：AI がサイトの中身を把握しやすいように要約と主要ページを並べる
import { CATEGORY_SLUGS, PREF_SLUGS, getPublishedArticles } from "@/lib/data";
import { siteUrl } from "@/lib/cron-auth";
import { CATEGORIES } from "@/lib/options";
import { YAMANOTE } from "@/lib/yamanote";

export const revalidate = 86400;

export async function GET() {
  const articles = await getPublishedArticles(200);
  const label = (t: string) => CATEGORIES.find((c) => c.value === CATEGORY_SLUGS[t])?.label;
  const body = `# 自費歯科ナビ

> ホワイトニング・矯正・インプラント・自費クリーニングの費用を、各歯科医院の公式料金から集めて比較できるサイトです。予算と希望を入力すると条件に合う医院を提案します。価格は毎日更新し、出典ページを保存しています。

## 診断
- [予算と希望から歯科医院を診断](${siteUrl("/diagnosis")})

## 山手線の駅別
${YAMANOTE.map((s) => `- [${s.name}駅周辺の自費歯科](${siteUrl(`/station/${s.slug}`)})`).join("\n")}

## エリア別の費用相場
${Object.entries(PREF_SLUGS).flatMap(([p, name]) => Object.keys(CATEGORY_SLUGS).map((t) => `- [${name}の${label(t)}の費用相場](${siteUrl(`/area/${p}/${t}`)})`)).join("\n")}

## 選び方ガイド
${articles.map((a) => `- [${a.title}](${siteUrl(`/articles/${a.slug}`)}): ${a.description}`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
