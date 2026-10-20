import Link from "next/link";
import SponsoredClinics from "@/components/SponsoredClinics";
import YamanoteMap from "@/components/YamanoteMap";
import { getActiveSponsors, getPublishedArticles, getPublishedClinics, toMapClinics } from "@/lib/data";

// 決済・解約の Webhook で revalidatePath("/") されるので、掲載はすぐ反映される
export const revalidate = 3600;

export default async function Home() {
  const [sponsors, articles, clinics] = await Promise.all([getActiveSponsors(), getPublishedArticles(6), getPublishedClinics()]);
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">自費の歯科治療、予算でいくら？どこで？</h1>
        <p className="mt-3 text-gray-600">ホワイトニング・矯正・インプラント・自費クリーニングの費用と、あなたに合う医院を30秒で診断。</p>
        <Link href="/diagnosis" className="mt-6 inline-block rounded-xl bg-sky-600 px-8 py-4 font-bold text-white shadow hover:bg-sky-700">
          無料で診断する
        </Link>
        <Link href="/consult" className="mt-3 block text-sm font-bold text-[#0B6E63] underline">
          行く前に先生を選んで、概算を聞く（オンライン相談）
        </Link>
      </section>

      <section id="yamanote" className="px-4 py-8">
        <h2 className="mb-1 text-center text-xl font-bold text-gray-900">山手線の駅から探す</h2>
        <p className="mb-4 text-center text-sm text-gray-600">通勤・通学で使う駅を押してみてください</p>
        <YamanoteMap clinics={toMapClinics(clinics)} />
      </section>

      <SponsoredClinics sponsors={sponsors} />

      {articles.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="mb-4 text-lg font-bold">選び方ガイド</h2>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="block rounded-xl border bg-white p-4 hover:border-sky-400">
                  <span className="block font-bold">{a.title}</span>
                  <span className="block text-sm text-gray-600">{a.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="px-4 py-10 text-center text-xs text-gray-500">
        <Link href="/for-clinics" className="hover:underline">歯科医院の方へ：おすすめ枠のご案内</Link>
      </footer>
    </main>
  );
}
