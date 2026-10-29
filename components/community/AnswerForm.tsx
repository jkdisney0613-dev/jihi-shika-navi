"use client";

// 質問への回答フォーム（経験者・治療中・検討中の人）
import Link from "next/link";
import { useState } from "react";
import { AGE_BANDS, ANSWERER_STAGES } from "@/lib/community-options";
import Chips from "./Chips";

export default function AnswerForm({ questionId }: { questionId: string }) {
  const [stage, setStage] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const canSend = stage && body.trim().length >= 5 && agree && !sending;

  const send = async () => {
    setSending(true);
    setError("");
    const res = await fetch("/api/community/answers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question_id: questionId, stage, age_band: age, body, agree }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res?.ok) return setError(data.error ?? "送信できませんでした");
    setDone(data.status);
  };

  if (done) {
    return (
      <p className="mt-4 rounded-2xl border-2 border-[#CFE0A8] bg-white p-4 text-sm">
        ありがとうございます！{done === "published" ? "回答を公開しました。ページを再読み込みすると表示されます。" : "内容を確認してから公開します。"}
      </p>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSend) send(); }} className="mt-4 rounded-2xl border-2 border-[#EADFCF] bg-white p-4">
      <h2 className="font-bold">あなたも答えてみる</h2>
      <Chips label="あなたは" required value={stage} onChange={setStage} options={ANSWERER_STAGES.map((s) => ({ value: s, label: s }))} />
      <Chips label="年代" value={age} onChange={setAge} options={AGE_BANDS.map((a) => ({ value: a, label: a }))} />
      <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 800))} rows={4} placeholder="自分の場合はどうだったか、やってよかったことなど"
        className="mt-4 w-full rounded-xl border-2 border-[#E2D6C2] p-3 text-[15px] focus:border-[#7AB648] focus:outline-none" />
      <label className="mt-2 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 accent-[#3F6E1E]" />
        <span><Link href="/community/rules" className="underline" target="_blank">投稿ルール</Link>に同意します（医院名・連絡先は書かない）</span>
      </label>
      {error && <p role="alert" className="mt-2 text-sm font-bold text-[#B4471C]">{error}</p>}
      <button type="submit" disabled={!canSend} className="mt-3 w-full rounded-full bg-[#3F6E1E] py-3 font-bold text-white disabled:bg-[#D9CBB8]">
        {sending ? "送信中…" : "回答する"}
      </button>
    </form>
  );
}
