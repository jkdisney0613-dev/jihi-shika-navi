import type { Metadata } from "next";
import DiagnosisForm, { type CountClinic } from "@/components/DiagnosisForm";
import { getPublishedClinics } from "@/lib/data";

export const metadata: Metadata = {
  title: "30秒で比べる自費歯科の費用｜予算と希望に合う歯科医院を探す",
  description:
    "ホワイトニング・マウスピース矯正の費用の目安と、ご予算・ご希望に合う歯科医院を無料で探せます。",
  alternates: { canonical: "/diagnosis" },
};

export const revalidate = 3600;

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const [{ station }, clinics] = await Promise.all([searchParams, getPublishedClinics()]);
  // 「候補◯院」を画面で数えるための軽いデータ（料金の下限と駅だけ）
  const counts: CountClinic[] = clinics.map((c) => ({
    prefecture: c.prefecture,
    station_slug: c.station_slug,
    t: c.treatments.map((t) => ({ o: t.option_code, min: t.price_min })),
  }));
  return (
    <main className="min-h-screen bg-[#FBF7F0] text-[#2B2118]">
      <section className="px-4 pt-8 text-center">
        <p className="text-sm font-bold text-[#3F6E1E]">無料・登録不要・30秒</p>
        <h1 className="mt-1 text-2xl font-bold">ビーバーと一緒に、条件に合う歯科医院をさがそう</h1>
        <p className="mt-2 text-sm text-[#6E5F4E]">4つの質問に答えるだけで、費用の目安と条件に合う医院がわかります。医療的な診断ではありません。</p>
      </section>
      <DiagnosisForm initialStation={station} clinics={counts} />
    </main>
  );
}
