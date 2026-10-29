"use client";

// 質問の投稿フォーム
import Link from "next/link";
import { useState } from "react";
import { COMMUNITY_OPTIONS, TOPICS, shortLabel } from "@/lib/community-options";
import Chips from "./Chips";

const box = "mt-2 w-full rounded-xl border-2 border-[#E2D6C2] bg-white p-3 text-[15px] focus:border-[#7AB648] focus:outline-none";

export default function QuestionForm() {
  const [topic, setTopic] = useState<string | null>(null);
  const [option, setOption] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ status: string; id: string } | null>(null);
  const canSend = topic && title.trim().length >= 5 && agree && !sending;

  const send = async () => {
    setSending(true);
    setError("");
    const res = await fetch("/api/community/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic, option_code: option, title, body, agree }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res?.ok) return setError(data.error ?? "送信できませんでした。通信状況を確かめてもう一度お試しください");
    setDone(data);
  };

  if (done) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-[#CFE0A8] bg-white p-5 text-center">
        <p className="text-lg font-bold">質問を受け付けました</p>
        <p className="mt-1 text-sm text-[#6E5F4E]">
          {done.status === "published" ? "経験者や歯科衛生士からの回答をお待ちください。" : "内容を確認してから公開します。専門家が回答すると公開されます。"}
        </p>
        <Link href={done.status === "published" ? `/community/questions/${done.id}` : "/community/questions"} className="mt-4 inline-block rounded-full bg-[#3F6E1E] px-5 py-2.5 text-sm font-bold text-white">
          {done.status === "published" ? "質問を見る" : "質問ひろばへ"}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSend) send(); }}>
      <Chips label="どんなこと？" required value={topic} onChange={setTopic} options={Object.entries(TOPICS).map(([value, label]) => ({ value, label }))} />
      <Chips label="治療（わかれば）" value={option} onChange={setOption} options={COMMUNITY_OPTIONS.map((o) => ({ value: o.value, label: shortLabel(o.value) }))} />
      <label className="mt-5 block text-sm font-bold">
        質問<span className="ml-1 text-[#B4471C]">必須</span><span className="ml-1 text-xs font-normal text-[#8A7A66]">80文字まで</span>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} className={box} placeholder="例：ワイヤーのまわりがすぐ黄ばむ。どうみがけばいい？" />
      </label>
      <label className="mt-4 block text-sm font-bold">
        くわしく<span className="ml-1 text-xs font-normal text-[#8A7A66]">任意・600文字まで</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 600))} rows={4} className={box} placeholder="例：表側のワイヤー矯正をして8か月です。" />
      </label>
      <p className="mt-4 rounded-xl bg-[#F4EEE3] p-3 text-xs leading-relaxed text-[#6E5F4E]">
        医院名・先生の名前・連絡先は書かないでください。痛みや腫れが強いときは、ここで待たずに通っている歯科医院へ連絡してください。
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 accent-[#3F6E1E]" />
        <span><Link href="/community/rules" className="underline" target="_blank">投稿ルール</Link>に同意して投稿します</span>
      </label>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-[#B4471C]">{error}</p>}
      <button type="submit" disabled={!canSend} className="mt-5 w-full rounded-full bg-[#B4471C] py-3.5 font-bold text-white shadow-[0_4px_0_#8a3414] disabled:bg-[#D9CBB8] disabled:shadow-none">
        {sending ? "送信中…" : "質問する"}
      </button>
    </form>
  );
}
