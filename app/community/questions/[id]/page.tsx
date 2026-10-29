import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnswerBlock from "@/components/community/AnswerBlock";
import AnswerForm from "@/components/community/AnswerForm";
import CommunityHeader from "@/components/community/CommunityHeader";
import { SampleBadge, SampleNotice, ago } from "@/components/community/ExperienceCard";
import HelpfulButton from "@/components/community/HelpfulButton";
import { COMMUNITY_READY, TOPICS, getQuestion, shortLabel } from "@/lib/community";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const q = await getQuestion((await params).id);
  if (!q) return {};
  return {
    title: `${q.title}｜質問ひろば`,
    description: q.answers[0]?.body.slice(0, 120) ?? q.body.slice(0, 120),
    ...(q.sample && { robots: { index: false } }), // 見本は検索に出さない
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const q = await getQuestion((await params).id);
  if (!q) notFound();
  return (
    <main className="min-h-screen bg-[#FBF7F0] pb-16 text-[#2B2118]">
      <CommunityHeader active="questions" beaver="search" say="みんなの答えを見てみよう" />
      <div className="mx-auto max-w-xl px-4">
        {q.sample && <SampleNotice what="質問と回答" />}
        <article className="mt-5 rounded-2xl border-2 border-[#EADFCF] bg-white p-4">
          <p className="flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-[#FBEADF] px-2.5 py-0.5 text-xs font-bold text-[#B4471C]">{TOPICS[q.topic]}</span>
            {q.option_code && <span className="rounded-full bg-[#EEF4E2] px-2.5 py-0.5 text-xs font-bold text-[#3F6E1E]">{shortLabel(q.option_code)}</span>}
            <span className="ml-auto">{q.sample ? <SampleBadge /> : <span className="text-xs text-[#8A7A66]">{ago(q.created_at)}</span>}</span>
          </p>
          <h1 className="mt-2 text-lg font-bold leading-snug">{q.title}</h1>
          {q.body && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.body}</p>}
          {!q.sample && <div className="mt-3"><HelpfulButton target="question" id={q.id} count={q.same} label="同じ悩み" emoji="🙋" /></div>}
        </article>

        <h2 className="mt-6 font-bold">回答 {q.answers.length}件</h2>
        {q.answers.map((a) => <AnswerBlock key={a.id} a={a} helpful={!q.sample} />)}
        {q.answers.length === 0 && <p className="mt-2 text-sm text-[#8A7A66]">まだ回答がありません。歯科衛生士にも届いています。</p>}

        {q.sample ? (
          <Link href="/community/questions/new" className="mt-4 block rounded-xl bg-[#B4471C] py-3 text-center text-sm font-bold text-white">見本です。あなたの質問を投稿してみる</Link>
        ) : (
          COMMUNITY_READY() && <AnswerForm questionId={q.id} />
        )}
        <p className="mt-6 text-xs leading-relaxed text-[#8A7A66]">専門家の回答は一般的な情報です。診断や治療方針は、通っている歯科医院で相談してください。</p>
        <Link href="/community/questions" className="mt-4 inline-block text-sm font-bold text-[#3F6E1E]">← 質問ひろばへ</Link>
      </div>
    </main>
  );
}
