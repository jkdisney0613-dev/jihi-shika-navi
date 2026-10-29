// みんなの記録の1件
import { CHOOSE_AGAIN, durationLabel, shortLabel, type Experience } from "@/lib/community";
import { formatPrice } from "@/lib/options";
import HelpfulButton from "./HelpfulButton";

export const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "今日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}か月前`;
  return `${Math.floor(days / 365)}年前`;
};

export const SampleBadge = () => (
  <span className="flex-none rounded-md border border-[#C9B79C] px-2 py-0.5 text-xs font-bold text-[#8A7A66]">見本</span>
);

/** 見本を出しているときの説明 */
export const SampleNotice = ({ what }: { what: string }) => (
  <p className="mt-4 rounded-xl bg-[#F4EEE3] px-3 py-2 text-xs leading-relaxed text-[#6E5F4E]">
    いまは「見本」の{what}を表示しています。実際の投稿が届くと入れ替わります。
  </p>
);

const Dots = ({ n }: { n: number }) => <span aria-label={`5段階の${n}`}>{"●".repeat(n)}{"○".repeat(5 - n)}</span>;

export default function ExperienceCard({ e }: { e: Experience }) {
  return (
    <article className="rounded-2xl border-2 border-[#EADFCF] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex flex-wrap gap-1">
          <span className="rounded-full bg-[#EEF4E2] px-2.5 py-0.5 text-xs font-bold text-[#3F6E1E]">{shortLabel(e.option_code)}</span>
          {e.age_band && <span className="rounded-full bg-[#F4EEE3] px-2.5 py-0.5 text-xs font-bold text-[#6E5F4E]">{e.age_band}</span>}
        </p>
        {e.sample ? <SampleBadge /> : <span className="flex-none text-xs text-[#8A7A66]">{ago(e.created_at)}</span>}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p>
          総額 <b className="text-xl">{formatPrice(e.total_paid)}</b>
          {e.months !== null && <span className="text-sm text-[#6E5F4E]">・{durationLabel(e.months)}</span>}
        </p>
        <span className="flex-none tracking-wider text-[#E0A100]" aria-label={`満足度5段階の${e.satisfaction}`}>
          {"★".repeat(e.satisfaction)}{"☆".repeat(5 - e.satisfaction)}
        </span>
      </div>
      <p className="mt-1 flex justify-between text-xs text-[#8A7A66]">
        <span>{e.pain !== null && <>痛み <Dots n={e.pain} /></>}</span>
        {e.choose_again && <span>{CHOOSE_AGAIN[e.choose_again]}</span>}
      </p>
      {e.good && <p className="mt-2 text-sm leading-relaxed"><b>よかった：</b>{e.good}</p>}
      {e.regret && <p className="mt-1 text-sm leading-relaxed"><b>後悔・注意：</b>{e.regret}</p>}
      {!e.sample && (
        <div className="mt-3">
          <HelpfulButton target="experience" id={e.id} count={e.helpful} label="参考になった" emoji="👍" />
        </div>
      )}
    </article>
  );
}
