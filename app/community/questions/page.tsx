// 質問ひろば：お手入れ・費用・選び方の悩みに、経験者と歯科衛生士・歯科医師が答える
import type { Metadata } from "next";
import Link from "next/link";
import AnswerBlock from "@/components/community/AnswerBlock";
import CommunityHeader from "@/components/community/CommunityHeader";
import { SampleBadge, SampleNotice, ago } from "@/components/community/ExperienceCard";
import HelpfulButton from "@/components/community/HelpfulButton";
import { COMMUNITY_READY, TOPICS, getQuestions, shortLabel, type Topic } from "@/lib/community";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "質問ひろば｜矯正・ホワイトニングのお手入れや費用の悩み",
  description: "ワイヤー矯正のみがき方、マウスピースのお手入れ、費用の見落としなど、矯正・ホワイトニングの悩みに経験者と歯科衛生士が答えます。",
  alternates: { canonical: "/community/questions" },
};

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ t?: string; expert?: string }> }) {
  const { t, expert } = await searchParams;
  const topic = t && t in TOPICS ? (t as Topic) : null;
  const expertOnly = expert === "1";
  const questions = await getQuestions({ topic, expertOnly });
  const ready = COMMUNITY_READY();
  const tabs = [
    { href: "/community/questions", label: "新着", on: !topic && !expertOnly },
    { href: "/community/questions?expert=1", label: "専門家が回答", on: expertOnly },
    ...Object.entries(TOPICS).map(([v, l]) => ({ href: `/community/questions?t=${v}`, label: l, on: topic === v })),
  ];

  return (
    <main className="min-h-screen bg-[#FBF7F0] pb-28 text-[#2B2118]">
      <CommunityHeader active="questions" beaver="search" say={<>気になることは、<br />やった人と専門家に聞いてみよう</>} />
      <div className="mx-auto max-w-3xl px-4">
        {questions.some((q) => q.sample) && <SampleNotice what="質問と回答" />}
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {tabs.map((x) => (
            <Link key={x.href} href={x.href} aria-current={x.on ? "true" : undefined}
              className={`flex-none rounded-full border-2 px-3 py-1 text-sm font-bold ${x.on ? "border-[#3F6E1E] bg-[#3F6E1E] text-white" : "border-[#E2D6C2] bg-white text-[#6E5F4E]"}`}>
              {x.label}
            </Link>
          ))}
        </div>
        <h1 className="sr-only">質問ひろば</h1>

        <div className="mt-4 space-y-3">
          {questions.map((q) => {
            const top = q.answers[0];
            return (
              <article key={q.id} className="rounded-2xl border-2 border-[#EADFCF] bg-white p-4">
                <p className="flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-[#FBEADF] px-2.5 py-0.5 text-xs font-bold text-[#B4471C]">{TOPICS[q.topic]}</span>
                  {q.option_code && <span className="rounded-full bg-[#EEF4E2] px-2.5 py-0.5 text-xs font-bold text-[#3F6E1E]">{shortLabel(q.option_code)}</span>}
                  <span className="ml-auto">{q.sample ? <SampleBadge /> : <span className="text-xs text-[#8A7A66]">{ago(q.created_at)}</span>}</span>
                </p>
                <Link href={`/community/questions/${q.id}`} className="mt-2 block text-[16px] font-bold leading-snug hover:underline">{q.title}</Link>
                {top ? <AnswerBlock a={top} helpful={false} /> : <p className="mt-2 text-sm text-[#8A7A66]">まだ回答がありません</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!q.sample && <HelpfulButton target="question" id={q.id} count={q.same} label="同じ悩み" emoji="🙋" />}
                  <Link href={`/community/questions/${q.id}`} className="ml-auto text-sm font-bold text-[#3F6E1E]">
                    {q.answers.length > 1 ? `回答${q.answers.length}件を見る` : "答える・くわしく"} →
                  </Link>
                </div>
              </article>
            );
          })}
          {questions.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-[#E2D6C2] p-6 text-center text-sm text-[#6E5F4E]">まだ質問がありません。気になっていること、聞いてみませんか？</p>
          )}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-[#8A7A66]">
          専門家の回答は一般的な情報です。診断や治療方針は、通っている歯科医院で相談してください。
          <Link href="/community/rules" className="ml-1 underline">投稿ルール</Link>
        </p>
      </div>
      {ready ? (
        <Link href="/community/questions/new" className="fixed bottom-5 right-4 rounded-full bg-[#B4471C] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_0_#8a3414]">＋ 質問する</Link>
      ) : (
        <p className="fixed inset-x-0 bottom-0 bg-[#2B2118] py-2 text-center text-xs text-white">質問の受付はまもなく始まります</p>
      )}
    </main>
  );
}
