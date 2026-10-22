// エリア × 治療のランディングページ（例：/area/kanagawa/orthodontics →「神奈川県の矯正 予算別の費用と医院」）
// 医院データが増えるたびに毎日自動で更新される
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICE_DISCLAIMER } from "@/lib/compliance";
import { CATEGORY_SLUGS, PREF_SLUGS, getPublishedClinics, priceStats } from "@/lib/data";
import { siteUrl } from "@/lib/cron-auth";
import { BUDGETS, CATEGORIES, OPTIONS, formatPrice } from "@/lib/options";

export const revalidate = 86400;

type Props = { params: Promise<{ pref: string; treatment: string }> };

export function generateStaticParams() {
  return Object.keys(PREF_SLUGS).flatMap((pref) => Object.keys(CATEGORY_SLUGS).map((treatment) => ({ pref, treatment })));
}

function resolve(p: { pref: string; treatment: string }) {
  const prefecture = PREF_SLUGS[p.pref];
  const category = CATEGORY_SLUGS[p.treatment];
  if (!prefecture || !category) return null;
  return { prefecture, category, label: CATEGORIES.find((c) => c.value === category)!.label };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = resolve(await params);
  if (!r) return {};
  const title = `${r.prefecture}の${r.label}｜費用相場と予算別の歯科医院`;
  return {
    title,
    description: `${r.prefecture}で${r.label}を受けられる歯科医院の費用を予算別に比較。当サイトが各医院の公式サイトから集めた料金データをもとに、相場と選び方を解説します。`,
    alternates: { canonical: `/area/${(await params).pref}/${(await params).treatment}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const p = await params;
  const r = resolve(p);
  if (!r) notFound();

  const clinics = (await getPublishedClinics()).filter((c) => c.prefecture === r.prefecture);
  const stats = priceStats(clinics, r.category, r.prefecture);
  const prefix = { whitening: "whitening", orthodontics: "ortho", implant: "implant", cleaning: "cleaning" }[r.category];
  const offering = clinics.filter((c) => c.treatments.some((t) => t.option_code.startsWith(prefix)));
  const minPrice = (c: (typeof clinics)[number]) => Math.min(...c.treatments.filter((t) => t.option_code.startsWith(prefix)).map((t) => t.price_min));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${r.prefecture}の${r.label}に対応する歯科医院`,
    itemListElement: offering.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Dentist",
        name: c.name,
        address: { "@type": "PostalAddress", addressRegion: c.prefecture, addressLocality: c.city, addressCountry: "JP" },
        url: siteUrl(`/clinics/${c.slug}`),
      },
    })),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-bold text-gray-900">{r.prefecture}の{r.label}　費用相場と予算別の歯科医院</h1>
      <p className="mt-3 text-gray-700">
        当サイトが掲載している{r.prefecture}の{stats.clinicCount}院の公式料金をもとにした、{r.label}の費用の目安です（
        {new Date().toISOString().slice(0, 7)}時点）。
      </p>

      <h2 className="mt-8 mb-3 text-xl font-bold">メニュー別の費用相場</h2>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-2">メニュー</th><th>費用の目安</th><th>掲載院数</th></tr></thead>
        <tbody>
          {OPTIONS[r.category].map((o) => {
            const s = stats.byOption.get(o.value);
            return (
              <tr key={o.value} className="border-b">
                <td className="py-2">{o.label}</td>
                <td>{s ? `${formatPrice(s.min)}〜${formatPrice(s.max)}` : "データ収集中"}</td>
                <td>{s?.count ?? 0}院</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {BUDGETS[r.category].filter((b) => b.value !== null).map((b) => {
        const fit = offering.filter((c) => minPrice(c) <= b.value!);
        return (
          <section key={b.label} className="mt-8">
            <h2 className="mb-2 text-lg font-bold">予算{b.label}で選べる{r.prefecture}の医院（{fit.length}院）</h2>
            {fit.length === 0 ? (
              <p className="text-sm text-gray-500">この予算で受けられる掲載医院はまだありません。</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {fit.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clinics/${c.slug}`} className="font-bold text-sky-700 hover:underline">{c.name}</Link>
                    　{c.nearest_station} 徒歩{c.walk_minutes}分・{formatPrice(minPrice(c))}〜
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="mt-8 text-xs text-gray-500">{PRICE_DISCLAIMER}</p>
      <Link href="/diagnosis" className="mt-6 block rounded-xl bg-sky-600 py-4 text-center font-bold text-white hover:bg-sky-700">
        あなたの予算と希望で探す（無料）
      </Link>
    </main>
  );
}
