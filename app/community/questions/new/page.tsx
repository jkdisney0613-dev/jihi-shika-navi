import type { Metadata } from "next";
import CommunityHeader from "@/components/community/CommunityHeader";
import QuestionForm from "@/components/community/QuestionForm";
import { COMMUNITY_READY } from "@/lib/community";

export const metadata: Metadata = { title: "質問する｜質問ひろば", robots: { index: false } };

export default function NewQuestionPage() {
  return (
    <main className="min-h-screen bg-[#FBF7F0] pb-16 text-[#2B2118]">
      <CommunityHeader active="questions" beaver="search" say={<>どんなことでも大丈夫。<br />やった人と歯科衛生士が答えるよ</>} />
      <div className="mx-auto max-w-xl px-4">
        <h1 className="mt-5 text-[22px] font-bold">質問する</h1>
        <p className="mt-1 text-sm text-[#6E5F4E]">匿名で投稿できます。</p>
        {COMMUNITY_READY() ? <QuestionForm /> : <p className="mt-6 rounded-xl bg-white p-4 text-sm">質問の受付はまもなく始まります。</p>}
      </div>
    </main>
  );
}
