"use client";

import { useState } from "react";

export default function NewsletterSignup({ interest, prefecture }: { interest?: string; prefecture?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, interest, prefecture }),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") {
    return <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800">確認メールを送りました。メール内のボタンを押すと登録が完了します。</p>;
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-sm font-bold text-gray-800">自費診療の選び方ガイドをメールで受け取る（無料）</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <button disabled={state === "sending"} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-300">
          登録
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-red-600">登録できませんでした。アドレスを確認してください。</p>}
      <p className="mt-2 text-xs text-gray-400">いつでもワンクリックで配信停止できます。</p>
    </form>
  );
}
