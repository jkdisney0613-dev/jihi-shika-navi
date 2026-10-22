import type { Metadata } from "next";
import DiagnosisForm from "@/components/DiagnosisForm";

export const metadata: Metadata = {
  title: "30秒で比べる自費歯科の費用｜予算と希望に合う歯科医院を探す",
  description:
    "ホワイトニング・マウスピース矯正・インプラント・自費クリーニングの費用相場と、ご予算・ご希望に合う歯科医院を無料で探せます。",
  alternates: { canonical: "/diagnosis" },
};

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const { station } = await searchParams;
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <section className="px-4 pt-10 text-center">
        <p className="text-sm font-bold text-sky-600">無料・登録不要</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">予算と希望から、条件に合う歯科医院を探す</h1>
        <p className="mt-2 text-sm text-gray-600">4つの質問に答えるだけで、費用の目安と条件に合う医院がわかります。医療的な診断ではありません。</p>
      </section>
      <DiagnosisForm initialStation={station} />
    </main>
  );
}
