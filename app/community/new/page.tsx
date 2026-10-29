import type { Metadata } from "next";
import CommunityHeader from "@/components/community/CommunityHeader";
import ExperienceForm from "@/components/community/ExperienceForm";
import { COMMUNITY_READY } from "@/lib/community";

export const metadata: Metadata = { title: "記録を書く｜みんなの記録", robots: { index: false } };

export default function NewExperiencePage() {
  return (
    <main className="min-h-screen bg-[#FBF7F0] pb-16 text-[#2B2118]">
      <CommunityHeader active="records" beaver="brush" say={<>あなたの体験が、<br />これから選ぶ人の助けになるよ</>} />
      <div className="mx-auto max-w-xl px-4">
        <h1 className="mt-5 text-[22px] font-bold">記録を書く（1分）</h1>
        <p className="mt-1 text-sm text-[#6E5F4E]">匿名で投稿できます。ほとんど押して選ぶだけです。</p>
        {COMMUNITY_READY() ? <ExperienceForm /> : <p className="mt-6 rounded-xl bg-white p-4 text-sm">投稿の受付はまもなく始まります。</p>}
      </div>
    </main>
  );
}
