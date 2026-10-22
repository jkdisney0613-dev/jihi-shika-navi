// 山手線の駅ページ（例：/station/shibuya →「渋谷駅周辺の自費歯科　費用と予算別の医院」）
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICE_DISCLAIMER } from "@/lib/compliance";
import { getPublishedClinics } from "@/lib/data";
import { BUDGETS, CATEGORIES, formatPrice } from "@/lib/options";
import type { Clinic, TreatmentCategory } from "@/lib/types";
import { YAMANOTE, stationBySlug, stationDistance } from "@/lib/yamanote";

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return YAMANOTE.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = stationBySlug((await params).slug);
  if (!s) return {};
  return {
    title: `${s.name}駅周辺の自費歯科｜ホワイトニング・矯正・インプラントの費用と医院`,
    description: `${s.name}駅周辺で自費診療（ホワイトニング・マウスピース矯正・インプラント・自費クリーニング）を受けられる歯科医院を、予算別に比較できます。`,
    alternates: { canonical: `/station/${s.slug}` },
  };
}

const PREFIX: Record<TreatmentCategory, string> = { whitening: "whitening", orthodontics: "ortho", implant: "implant", cleaning: "cleaning" };
const minPrice = (c: Clinic, cat: TreatmentCategory) => {
  const ts = c.treatments.filter((t) => t.option_code.startsWith(PREFIX[cat]));
  return ts.length ? Math.min(...ts.map((t) => t.price_min)) : null;
};

export default async function StationPage({ params }: Props) {
  const s = stationBySlug((await params).slug);
  if (!s) notFound();
  const i = YAMANOTE.findIndex((x) => x.slug === s.slug);
  const prev = YAMANOTE[(i - 1 + YAMANOTE.length) % YAMANOTE.length];
  const next = YAMANOTE[(i + 1) % YAMANOTE.length];

  const all = await getPublishedClinics();
  const here = all.filter((c) => c.station_slug === s.slug);
  const nearby = all.filter((c) => {
    const d = stationDistance(s.slug, c.station_slug);
    return d !== null && d > 0 && d <= 2;
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <nav className="mb-4 flex justify-between text-sm">
        <Link href={`/station/${prev.slug}`} className="text-lime-700 hover:underline">← {prev.name}</Link>
        <Link href="/#yamanote" className="text-gray-500 hover:underline">路線図</Link>
        <Link href={`/station/${next.slug}`} className="text-lime-700 hover:underline">{next.name} →</Link>
      </nav>
      <p className="text-sm font-bold text-lime-700">山手線 {s.name}駅</p>
      <h1 className="text-2xl font-bold text-gray-900">{s.name}駅周辺の自費歯科　費用と予算別の医院</h1>
      <p className="mt-3 text-gray-700">
        当サイトが調べた{s.name}駅周辺の{here.length}院について、自費メニューの費用を公式サイトの料金表をもとにまとめています（{new Date().toISOString().slice(0, 7)}時点）。
      </p>

      {here.length === 0 && (
        <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">この駅の周辺はただいまリサーチ中です。隣の駅の医院も参考にしてください。</p>
      )}

      {CATEGORIES.map((cat) => {
        const offering = here.filter((c) => minPrice(c, cat.value) !== null).sort((a, b) => minPrice(a, cat.value)! - minPrice(b, cat.value)!);
        if (offering.length === 0) return null;
        const budget = BUDGETS[cat.value].find((b) => b.value !== null && offering.some((c) => minPrice(c, cat.value)! <= b.value!));
        return (
          <section key={cat.value} className="mt-8">
            <h2 className="mb-2 text-lg font-bold">{s.name}駅の{cat.label}（{offering.length}院）</h2>
            {budget && <p className="mb-2 text-sm text-gray-600">予算{budget.label}から選べます。</p>}
            <ul className="space-y-2 text-sm">
              {offering.map((c) => (
                <li key={c.id}>
                  <Link href={`/clinics/${c.slug}`} className="font-bold text-sky-700 hover:underline">{c.name}</Link>
                  　徒歩{c.walk_minutes}分・{formatPrice(minPrice(c, cat.value)!)}〜
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {nearby.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-bold">近くの駅の医院</h2>
          <ul className="space-y-2 text-sm">
            {nearby.map((c) => (
              <li key={c.id}>
                <Link href={`/clinics/${c.slug}`} className="font-bold text-sky-700 hover:underline">{c.name}</Link>　{c.nearest_station}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-gray-500">{PRICE_DISCLAIMER}</p>
      <Link href={`/diagnosis?station=${s.slug}`} className="mt-6 block rounded-xl bg-sky-600 py-4 text-center font-bold text-white hover:bg-sky-700">
        {s.name}駅で予算に合う医院を探す（無料）
      </Link>
    </main>
  );
}
