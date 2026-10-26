import Link from "next/link";
import SponsoredClinics from "@/components/SponsoredClinics";
import YamanoteMap from "@/components/YamanoteMap";
import { getActiveSponsors, getPublishedArticles, getPublishedClinics, toMapClinics } from "@/lib/data";
import { CONSULT_ENABLED } from "@/lib/demo";
import { CATEGORIES, OPTIONS, formatPrice } from "@/lib/options";
import type { Clinic, TreatmentCategory, TreatmentOption } from "@/lib/types";
import { PER_STATION_TARGET, STATION_PRIORITY, stationBySlug } from "@/lib/yamanote";

// 決済・解約の Webhook で revalidatePath("/") されるので、掲載はすぐ反映される
export const revalidate = 3600;

const PREFIX: Record<TreatmentCategory, string> = { whitening: "whitening_", orthodontics: "ortho_", implant: "implant_", cleaning: "cleaning_" };
const BUTTON_LABEL: Partial<Record<TreatmentCategory, string>> = { orthodontics: "歯並び・矯正" };
// 「いま比べられる料金」に出すメニュー（掲載がないものは出さない）
const PRICE_CARDS: TreatmentOption[] = ["whitening_office", "whitening_home", "ortho_aligner", "ortho_partial", "implant_single", "cleaning_pmtc"];

/** 条件に合う医院の数と、いちばん低い料金 */
function summarize(clinics: Clinic[], match: (option: string) => boolean) {
  const prices = clinics.flatMap((c) => {
    const ts = c.treatments.filter((t) => match(t.option_code));
    return ts.length ? [Math.min(...ts.map((t) => t.price_min))] : [];
  });
  return { count: prices.length, min: prices.length ? Math.min(...prices) : null };
}

export default async function Home() {
  const [sponsors, articles, clinics] = await Promise.all([getActiveSponsors(), getPublishedArticles(6), getPublishedClinics()]);
  const perStation = new Map<string, number>();
  for (const c of clinics) if (c.station_slug) perStation.set(c.station_slug, (perStation.get(c.station_slug) ?? 0) + 1);
  // 医院がある駅と、その次に調べる駅までを並べる
  const firstEmpty = STATION_PRIORITY.findIndex((s) => !perStation.get(s));
  const shownStations = STATION_PRIORITY.slice(0, Math.max(5, firstEmpty + 2));
  const nextStation = stationBySlug(STATION_PRIORITY.find((s) => (perStation.get(s) ?? 0) < PER_STATION_TARGET));
  const priceCards = PRICE_CARDS.map((o) => ({ o, ...summarize(clinics, (x) => x === o) })).filter((p) => p.count > 0);
  const label = (o: TreatmentOption) => Object.values(OPTIONS).flat().find((x) => x.value === o)?.label ?? o;

  return (
    <main className="min-h-screen bg-[#FBF7F0] text-[#2B2118]">
      <header className="border-b border-[#EADFCF] bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <p className="text-lg font-bold text-[#3F6E1E]">自費歯科ナビ</p>
          <p className="text-xs text-[#8A7A66]">{CATEGORIES.map((c) => c.label).join("・")}の費用を比べる</p>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl px-4 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/beaver/hi.png" alt="案内役のビーバー" width={120} height={140} className="absolute right-3 top-4 h-36 w-auto sm:right-10" />
        <h1 className="w-3/5 text-[28px] font-bold leading-snug">気になるのは、<br />どっち？</h1>
        <p className="mt-2 w-3/5 text-[#6E5F4E]">押すだけで、料金と医院をくらべられます。無料・登録不要です。</p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const s = summarize(clinics, (o) => o.startsWith(PREFIX[c.value]));
            return (
              <Link
                key={c.value}
                href={`/diagnosis?category=${c.value}`}
                className="rounded-3xl border-2 border-[#E2D6C2] bg-white px-3 py-5 text-center shadow-[0_3px_0_#E2D6C2] transition hover:-translate-y-0.5 hover:border-[#7AB648]"
              >
                <span className="block text-3xl">{c.icon}</span>
                <span className="mt-1 block text-lg font-bold">{BUTTON_LABEL[c.value] ?? c.label}</span>
                <span className="block text-sm text-[#6E5F4E]">{s.count > 0 && s.min !== null ? `${s.count}院・${formatPrice(s.min)}〜` : "準備中"}</span>
              </Link>
            );
          })}
        </div>
        {CONSULT_ENABLED && (
          <Link href="/consult" className="mt-4 block text-center text-sm font-bold text-[#0B6E63] underline">
            行く前に先生を選んで、概算を聞く（オンライン相談）
          </Link>
        )}
      </section>

      {priceCards.length > 0 && (
        <section className="mx-auto mt-8 max-w-3xl px-4">
          <h2 className="text-xl font-bold">
            いま比べられる料金 <span className="text-sm font-normal text-[#6E5F4E]">医院の公式サイトで確認</span>
          </h2>
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
            {priceCards.map((p) => (
              <Link
                key={p.o}
                href={`/diagnosis?category=${Object.entries(PREFIX).find(([, v]) => p.o.startsWith(v))![0]}`}
                className="w-40 flex-none rounded-2xl border border-[#EADFCF] bg-white p-3 hover:border-[#7AB648]"
              >
                <span className="block text-sm">{label(p.o)}</span>
                <span className="block text-xl font-bold text-[#B4471C]">{formatPrice(p.min!)}〜</span>
                <span className="block text-sm text-[#6E5F4E]">{p.count}院</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-[#8A7A66]">※いちばん低いプランの料金です。検査料などが別にかかる場合があります。</p>
        </section>
      )}

      <section className="mx-auto mt-8 max-w-3xl px-4">
        <h2 className="text-xl font-bold">駅から探す</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {shownStations.map((slug) => {
            const st = stationBySlug(slug)!;
            const n = perStation.get(slug) ?? 0;
            return n > 0 ? (
              <Link key={slug} href={`/station/${slug}`} className="rounded-2xl border-2 border-[#E2D6C2] bg-white px-4 py-2.5 font-bold hover:border-[#7AB648]">
                {st.name}
                <span className="ml-1 text-sm font-normal text-[#6E5F4E]">{n}院</span>
              </Link>
            ) : (
              <span key={slug} className="rounded-2xl border-2 border-dashed border-[#E2D6C2] px-4 py-2.5 font-bold text-[#9C8C76]">
                {st.name}
                <span className="ml-1 text-sm font-normal">準備中</span>
              </span>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-[#EEF5E6] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/beaver/brush.png" alt="" width={72} height={84} className="h-20 w-auto flex-none" />
          <div>
            <p className="font-bold">医院を毎日少しずつ増やしています</p>
            <p className="text-sm text-[#5A4A3A]">
              掲載{clinics.length}院。{nextStation ? `いまは${nextStation.name}駅のまわりを調べています` : "山手線ぜんぶの駅を調べ終わりました"}
            </p>
          </div>
        </div>
      </section>

      <section id="yamanote" className="px-4 py-10">
        <h2 className="mb-1 text-center text-xl font-bold">路線図から探す</h2>
        <p className="mb-4 text-center text-sm text-[#6E5F4E]">通勤・通学で使う駅を押してみてください</p>
        <YamanoteMap clinics={toMapClinics(clinics)} />
      </section>

      <SponsoredClinics sponsors={sponsors} />

      {articles.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="mb-4 text-lg font-bold">選び方ガイド</h2>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="block rounded-2xl border border-[#EADFCF] bg-white p-4 hover:border-[#7AB648]">
                  <span className="block font-bold">{a.title}</span>
                  <span className="block text-sm text-[#6E5F4E]">{a.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="px-4 py-10 text-center text-xs text-[#8A7A66]">
        <Link href="/for-clinics" className="hover:underline">歯科医院の方へ：掲載情報の修正・掲載停止のご依頼</Link>
      </footer>
    </main>
  );
}
