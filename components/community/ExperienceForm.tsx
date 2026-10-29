"use client";

// みんなの記録の投稿フォーム。ほとんど押して選ぶだけで、文章は書かなくても送れる
import Link from "next/link";
import { useState } from "react";
import { AGE_BANDS, CHOOSE_AGAIN, COMMUNITY_OPTIONS, DURATIONS, shortLabel } from "@/lib/community-options";
import { formatPrice } from "@/lib/options";
import Chips from "./Chips";

const area = "mt-2 w-full rounded-xl border-2 border-[#E2D6C2] bg-white p-3 text-[15px] focus:border-[#7AB648] focus:outline-none";

export default function ExperienceForm() {
  const [option, setOption] = useState<string | null>(null);
  const [total, setTotal] = useState("");
  const [months, setMonths] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [again, setAgain] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [good, setGood] = useState("");
  const [regret, setRegret] = useState("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"published" | "pending" | null>(null);

  const yen = Number(total.replace(/[^\d]/g, ""));
  const canSend = option && yen >= 1000 && satisfaction && agree && !sending;

  const send = async () => {
    setSending(true);
    setError("");
    const res = await fetch("/api/community/experiences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ option_code: option, total_paid: yen, months, pain, satisfaction, choose_again: again, age_band: age, good, regret, agree }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res?.ok) return setError(data.error ?? "送信できませんでした。通信状況を確かめてもう一度お試しください");
    setDone(data.status);
  };

  if (done) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-[#CFE0A8] bg-white p-5 text-center">
        <p className="text-lg font-bold">ありがとうございます！</p>
        <p className="mt-1 text-sm text-[#6E5F4E]">
          {done === "published" ? "記録を公開しました。これから選ぶ人の参考になります。" : "内容を確認してから公開します（医院名などが含まれていないかを見ています）。"}
        </p>
        <Link href="/community" className="mt-4 inline-block rounded-full bg-[#3F6E1E] px-5 py-2.5 text-sm font-bold text-white">みんなの記録へ</Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSend) send(); }}>
      <Chips label="受けた治療" required value={option} onChange={setOption} options={COMMUNITY_OPTIONS.map((o) => ({ value: o.value, label: shortLabel(o.value) }))} />

      <label className="mt-5 block text-sm font-bold">
        実際に払った総額<span className="ml-1 text-[#B4471C]">必須</span>
        <span className="block text-xs font-normal text-[#8A7A66]">検査料・調整料・保定装置なども含めた、だいたいの合計でOKです</span>
        <span className="mt-2 flex items-center gap-2">
          <input
            inputMode="numeric"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="例：880000"
            className="w-44 rounded-xl border-2 border-[#E2D6C2] bg-white px-3 py-2.5 text-lg focus:border-[#7AB648] focus:outline-none"
          />
          <span>円</span>
          {yen >= 1000 && <span className="text-sm font-bold text-[#B4471C]">＝{formatPrice(yen)}</span>}
        </span>
      </label>

      <Chips label="かかった期間" value={months} onChange={setMonths} options={DURATIONS} />
      <Chips label="満足度" required value={satisfaction} onChange={setSatisfaction} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: "★".repeat(n) }))} />
      <Chips label="痛み" value={pain} onChange={setPain} options={[{ value: 1, label: "ほぼなし" }, { value: 2, label: "少し" }, { value: 3, label: "ふつう" }, { value: 4, label: "痛い" }, { value: 5, label: "かなり痛い" }]} />
      <Chips label="もう一度選ぶなら" value={again} onChange={setAgain} options={Object.entries(CHOOSE_AGAIN).map(([value, label]) => ({ value, label }))} />
      <Chips label="年代" value={age} onChange={setAge} options={AGE_BANDS.map((a) => ({ value: a, label: a }))} />

      <label className="mt-5 block text-sm font-bold">
        よかったこと<span className="ml-1 text-xs font-normal text-[#8A7A66]">任意・300文字まで</span>
        <textarea value={good} onChange={(e) => setGood(e.target.value.slice(0, 300))} rows={3} className={area} placeholder="例：仕事中も目立たなかった" />
      </label>
      <label className="mt-4 block text-sm font-bold">
        後悔したこと・最初に知りたかったこと<span className="ml-1 text-xs font-normal text-[#8A7A66]">任意・300文字まで</span>
        <textarea value={regret} onChange={(e) => setRegret(e.target.value.slice(0, 300))} rows={3} className={area} placeholder="例：保定装置の費用が別だった" />
      </label>

      <p className="mt-4 rounded-xl bg-[#F4EEE3] p-3 text-xs leading-relaxed text-[#6E5F4E]">
        医院名・先生の名前・住所・連絡先は書かないでください。写真は受け付けていません。書かれていた場合は公開しないことがあります。
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 accent-[#3F6E1E]" />
        <span><Link href="/community/rules" className="underline" target="_blank">投稿ルール</Link>に同意して投稿します</span>
      </label>

      {error && <p role="alert" className="mt-3 text-sm font-bold text-[#B4471C]">{error}</p>}
      <button
        type="submit"
        disabled={!canSend}
        className="mt-5 w-full rounded-full bg-[#B4471C] py-3.5 text-base font-bold text-white shadow-[0_4px_0_#8a3414] disabled:bg-[#D9CBB8] disabled:shadow-none"
      >
        {sending ? "送信中…" : "記録を投稿する"}
      </button>
    </form>
  );
}
