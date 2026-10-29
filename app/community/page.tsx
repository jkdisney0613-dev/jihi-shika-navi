// みんなの記録：施術ごとに「公式サイトの価格」と「やってみた人が実際に払った総額」を並べる
// 医院名は出さず、医院ページとはつなげない（医院の順位や評価には使わない）
import type { Metadata } from "next";
import Link from "next/link";
import CommunityHeader from "@/components/community/CommunityHeader";
import ExperienceCard, { SampleNotice } from "@/components/community/ExperienceCard";
import { COMMUNITY_OPTIONS, COMMUNITY_READY, MIN_RECORDS_FOR_STATS, getExperiences, getPaidStats, shortLabel } from "@/lib/community";
import { getPublishedClinics } from "@/lib/data";
import { formatPrice, formatPriceRange } from "@/lib/options";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "みんなの記録｜矯正・ホワイトニングに実際いくら払った？",
  description: "マウスピース矯正・ワイヤー矯正・ホワイトニングを受けた人が、実際に払った総額・期間・痛み・後悔したことを匿名で共有する場所です。",
  alternates: { canonical: "/community" },
};

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const { o } = await searchParams;
  const option = COMMUNITY_OPTIONS.find((x) => x.value === o)?.value ?? null;
  const [experiences, stats, clinics] = await Promise.all([getExperiences(option), getPaidStats(), getPublishedClinics()]);
  const ready = COMMUNITY_READY();

  // 公式サイトの価格（掲載医院の最低〜最高）
  const official = (code: string) => {
    const ts = clinics.flatMap((c) => c.treatments ?? []).filter((t) => t.option_code === code);
    return ts.length ? { min: Math.min(...ts.map((t) => t.price_min)), max: Math.max(...ts.map((t) => t.price_max ?? t.price_min)) } : null;
  };
  const counts = new Map<string, number>();
  for (const e of experiences) if (!e.sample) counts.set(e.option_code, (counts.get(e.option_code) ?? 0) + 1);
  const summaryCodes = option ? [option] : COMMUNITY_OPTIONS.map((x) => x.value).filter((c) => stats.has(c));

  return (
    <main className="min-h-screen bg-[#FBF7F0] pb-28 text-[#2B2118]">
      <CommunityHeader active="records" beaver="hi" say={<>実際いくら払った？<br />やってみた人の記録を見てみよう</>} />

      <div className="mx-auto max-w-3xl px-4">
        {experiences.some((e) => e.sample) && <SampleNotice what="記録（金額や感想はイメージです）" />}

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="治療で絞り込む">
          {[{ value: null, label: "すべて" }, ...COMMUNITY_OPTIONS.map((x) => ({ value: x.value, label: shortLabel(x.value) }))].map((x) => (
            <Link
              key={x.value ?? "all"}
              href={x.value ? `/community?o=${x.value}` : "/community"}
              aria-current={option === x.value ? "true" : undefined}
              className={`flex-none rounded-full border-2 px-3 py-1 text-sm font-bold ${
                option === x.value ? "border-[#3F6E1E] bg-[#3F6E1E] text-white" : "border-[#E2D6C2] bg-white text-[#6E5F4E]"
              }`}
            >
              {x.label}
            </Link>
          ))}
        </div>

        <h1 className="mt-5 text-[22px] font-bold leading-snug">実際いくら払った？<br />やってみた人の記録</h1>

        {summaryCodes.map((code) => {
          const s = stats.get(code);
          const off = official(code);
          const lo = Math.min(off?.min ?? Infinity, s?.p25 ?? Infinity) * 0.8;
          const hi = Math.max(off?.max ?? 0, s?.p75 ?? 0) * 1.1;
          const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
          return (
            <section key={code} className="mt-4 rounded-2xl border-2 border-[#EADFCF] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="rounded-md bg-[#2B2118] px-2.5 py-0.5 text-sm font-bold text-white">{shortLabel(code)}</h2>
                <span className="text-xs text-[#8A7A66]">記録 {s?.n ?? counts.get(code) ?? 0}件</span>
              </div>
              {off && (
                <p className="mt-2 flex justify-between text-sm"><span className="text-[#6E5F4E]">公式サイトの価格</span><b>{formatPriceRange(off.min, off.max)}</b></p>
              )}
              {s ? (
                <>
                  <p className="flex items-baseline justify-between text-sm">
                    <span className="text-[#6E5F4E]">みんなが払った総額</span>
                    <b className="text-2xl text-[#B4471C]">{formatPrice(s.median)}</b>
                  </p>
                  <div className="relative mt-2 h-2.5 rounded-full bg-[#EFE7D9]" aria-hidden>
                    <i className="absolute inset-y-0 rounded-full bg-[#E9B48F]" style={{ left: `${pct(s.p25)}%`, right: `${100 - pct(s.p75)}%` }} />
                    <b className="absolute -top-1 h-[18px] w-[3px] rounded bg-[#3F6E1E]" style={{ left: `${pct(s.median)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-[#8A7A66]">
                    真ん中の人で{formatPrice(s.median)}。半分の人が{formatPrice(s.p25)}〜{formatPrice(s.p75)}の間です。
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#6E5F4E]">記録が{MIN_RECORDS_FOR_STATS}件たまると「みんなが払った総額」を表示します。</p>
              )}
              <p className="mt-2 text-xs text-[#8A7A66]">※総額は検査料・調整料・保定装置などを含めて投稿者が答えた金額です。</p>
            </section>
          );
        })}

        <div className="mt-4 space-y-3">
          {experiences.map((e) => <ExperienceCard key={e.id} e={e} />)}
          {experiences.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-[#E2D6C2] p-6 text-center text-sm text-[#6E5F4E]">
              まだ記録がありません。最初のひとりになりませんか？
            </p>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[#8A7A66]">
          投稿は個人の体験と感想で、治療の効果や費用を保証するものではありません。医院名は表示していません。治療内容・リスク・費用は、必ず歯科医院で説明を受けてください。
          <Link href="/community/rules" className="ml-1 underline">投稿ルール</Link>
        </p>
      </div>

      {ready ? (
        <Link href="/community/new" className="fixed bottom-5 right-4 rounded-full bg-[#B4471C] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_0_#8a3414]">
          ＋ 記録を書く（1分）
        </Link>
      ) : (
        <p className="fixed inset-x-0 bottom-0 bg-[#2B2118] py-2 text-center text-xs text-white">投稿の受付はまもなく始まります</p>
      )}
    </main>
  );
}
