import type { Metadata } from "next";
import DiagnosisForm from "@/components/DiagnosisForm";

export const metadata: Metadata = {
  title: "30秒でわかる自費歯科診断｜予算と希望からおすすめ歯科医院を提案",
  description:
    "ホワイトニング・マウスピース矯正・インプラント・自費クリーニングの費用相場と、ご予算・ご希望に合う歯科医院を無料で診断します。",
  alternates: { canonical: "/diagnosis" },
};

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const { station } = await searchParams;
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <section className="px-4 pt-10 text-center">
        <p className="text-sm font-bold text-sky-600">無料・登録不要</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">予算と希望から、あなたに合う歯科医院を診断</h1>
        <p className="mt-2 text-sm text-gray-600">4つの質問に答えるだけで、費用の目安とおすすめ医院がわかります。</p>
      </section>
      <DiagnosisForm initialStation={station} />
    </main>
  );
}
