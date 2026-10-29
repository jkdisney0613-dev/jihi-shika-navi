import type { Metadata } from "next";
import Link from "next/link";
import SponsoredClinics from "@/components/SponsoredClinics";
import { AskIcon, BracesIcon, ChatIcon, Chevron, ToothIcon, TrainIcon } from "@/components/LineIcons";
import YamanoteMap from "@/components/YamanoteMap";
import { getActiveSponsors, getPublishedArticles, getPublishedClinics, toMapClinics } from "@/lib/data";
import { CONSULT_ENABLED } from "@/lib/demo";
import { CATEGORIES, OPTIONS, formatPrice } from "@/lib/options";
import type { Clinic, TreatmentCategory, TreatmentOption } from "@/lib/types";
import { PER_STATION_TARGET, STATION_PRIORITY, stationBySlug } from "@/lib/yamanote";

// 「気になるのは、どっち？」から始める探す画面（トップの紹介ページから進んでくる）
// 決済・解約の Webhook で revalidatePath("/start") されるので、掲載はすぐ反映される
export const revalidate = 3600;
export const metadata: Metadata = { title: "ホワイトニング・矯正の料金と医院をくらべる", alternates: { canonical: "/start" } };

const PREFIX: Record<TreatmentCategory, string> = { whitening: "whitening_", orthodontics: "ortho_", implant: "implant_", cleaning: "cleaning_" };
const BUTTON_LABEL: Partial<Record<TreatmentCategory, string>> = { orthodontics: "歯並び・矯正" };
// 「いま比べられる料金」に出すメニュー（掲載がないものは出さない）
const PRICE_CARDS: TreatmentOption[] = ["whitening_office", "whitening_home", "ortho_aligner", "ortho_partial", "implant_single", "cleaning_pmtc"];

const card = "rounded-2xl border border-[#E4E8DC] bg-white shadow-[0_1px_3px_rgba(35,48,31,0.06)] transition hover:border-[#9CC58A] hover:shadow-md";

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <h2 className="flex items-baseline gap-2 border-l-4 border-[#2F6B3A] pl-2.5 text-lg font-bold leading-tight">
      {children}
      {sub && <span className="text-xs font-normal text-[#7A8473]">{sub}</span>}
    </h2>
  );
}

/** 条件に合う医院の数と、いちばん低い料金 */
function summarize(clinics: Clinic[], match: (option: string) => boolean) {
  const prices = clinics.flatMap((c) => {
    const ts = c.treatments.filter((t) => match(t.option_code));
    return ts.length ? [Math.min(...ts.map((t) => t.price_min))] : [];
  });
  return { count: prices.length, min: prices.length ? Math.min(...prices) : null };
}

export default async function StartPage() {
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
    <main className="min-h-screen bg-[#F7F7F2] text-[#23301F]">
      <header className="border-b border-[#E4E8DC] bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-lg font-bold text-[#2F6B3A]">自費歯科ナビ</Link>
          <p className="text-xs text-[#7A8473]">{CATEGORIES.map((c) => c.label).join("・")}の費用を比べる</p>
        </div>
      </header>

      <section className="relative mx-auto max-w-3xl overflow-x-clip px-4 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/beaver/hi.png" alt="案内役のビーバー" width={190} height={196} className="absolute -right-2 top-2 h-[196px] w-auto sm:right-8" />
        <h1 className="relative w-[56%] text-[28px] font-bold leading-snug">気になるのは、<br />どっち？</h1>
        <p className="relative mt-2 w-[52%] text-[#5E6A58]">押すだけで、料金と医院をくらべられます。無料・登録不要です。</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const s = summarize(clinics, (o) => o.startsWith(PREFIX[c.value]));
            const Icon = c.value === "orthodontics" ? BracesIcon : ToothIcon;
            return (
              <Link key={c.value} href={`/diagnosis?category=${c.value}`} className={`${card} flex items-center gap-3 p-4`}>
                <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#EEF5E8] text-[#2F6B3A]"><Icon className="h-7 w-7" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold">{BUTTON_LABEL[c.value] ?? c.label}</span>
                  <span className="block text-xs text-[#6B7666]">{s.count > 0 && s.min !== null ? `${s.count}院・${formatPrice(s.min)}〜` : "準備中"}</span>
                </span>
                <Chevron className="h-5 w-5 flex-none text-[#9AA593]" />
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
        <section className="mx-auto mt-10 max-w-3xl px-4">
          <SectionTitle sub="医院の公式サイトで確認">いま比べられる料金</SectionTitle>
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
            {priceCards.map((p) => (
              <Link
                key={p.o}
                href={`/diagnosis?category=${Object.entries(PREFIX).find(([, v]) => p.o.startsWith(v))![0]}`}
                className={`${card} w-36 flex-none p-3`}
              >
                <span className="block min-h-[2.5em] text-xs leading-tight text-[#5E6A58]">{label(p.o)}</span>
                <span className="mt-1 block text-xl font-bold text-[#2F6B3A]">{formatPrice(p.min!)}<span className="text-sm">〜</span></span>
                <span className="block text-xs text-[#7A8473]">{p.count}院</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-[#7A8473]">※いちばん低いプランの料金です。検査料などが別にかかる場合があります。</p>
        </section>
      )}

      <section className="mx-auto mt-10 max-w-3xl px-4">
        <SectionTitle>駅から探す</SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {shownStations.map((slug) => {
            const st = stationBySlug(slug)!;
            const n = perStation.get(slug) ?? 0;
            return n > 0 ? (
              <Link key={slug} href={`/station/${slug}`} className="flex items-center gap-1.5 rounded-full bg-[#2F6B3A] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#275A31]">
                <TrainIcon className="h-4 w-4" />
                {st.name}
                <span className="font-normal opacity-80">{n}院</span>
              </Link>
            ) : (
              <span key={slug} className="flex items-center gap-1.5 rounded-full border border-[#D9DED0] bg-white px-4 py-2 text-sm font-bold text-[#8C9686]">
                <TrainIcon className="h-4 w-4" />
                {st.name}
                <span className="font-normal">準備中</span>
              </span>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#DCE8D2] bg-[#EEF5E8] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/beaver/brush.png" alt="" width={72} height={84} className="h-20 w-auto flex-none" />
          <div>
            <p className="text-[15px] font-bold text-[#2F6B3A]">医院を毎日少しずつ増やしています</p>
            <p className="text-sm text-[#4F5B4A]">
              掲載{clinics.length}院。{nextStation ? `いまは${nextStation.name}駅のまわりを調べています` : "山手線ぜんぶの駅を調べ終わりました"}
            </p>
          </div>
        </div>

        <div className="mt-10">
          <SectionTitle>やった人に聞いてみる</SectionTitle>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/community", Icon: ChatIcon, title: "みんなの記録", text: "実際いくら払った？後悔したことは？" },
            { href: "/community/questions", Icon: AskIcon, title: "質問ひろば", text: "お手入れや費用の悩みに歯科衛生士が答えます" },
          ].map(({ href, Icon, title, text }) => (
            <Link key={href} href={href} className={`${card} flex items-center gap-3 p-4`}>
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#EEF5E8] text-[#2F6B3A]"><Icon className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block text-xs text-[#6B7666]">{text}</span>
              </span>
              <Chevron className="h-5 w-5 flex-none text-[#9AA593]" />
            </Link>
          ))}
        </div>
      </section>

      <section id="yamanote" className="px-4 py-10">
        <h2 className="mb-1 text-center text-xl font-bold">路線図から探す</h2>
        <p className="mb-4 text-center text-sm text-[#5E6A58]">通勤・通学で使う駅を押してみてください</p>
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
