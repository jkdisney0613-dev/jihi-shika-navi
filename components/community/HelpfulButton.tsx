"use client";

// 「参考になった」などのボタン。押したことはこの端末に覚えておき、同じ投稿は1回だけ数える
import { useEffect, useState } from "react";

const KEY = "jihi-helpful-v1";
const read = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};

export default function HelpfulButton({ target, id, count, label, emoji }: { target: "experience" | "question" | "answer"; id: string; count: number; label: string; emoji: string }) {
  const [done, setDone] = useState(false);
  const [pressedNow, setPressedNow] = useState(false); // 前に押した分はもう count に入っている
  useEffect(() => setDone(read().includes(`${target}:${id}`)), [target, id]);

  const press = async () => {
    if (done) return;
    setDone(true);
    setPressedNow(true);
    try { localStorage.setItem(KEY, JSON.stringify([...read(), `${target}:${id}`].slice(-500))); } catch {}
    await fetch("/api/community/react", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target, id }) }).catch(() => null);
  };

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={done}
      className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-[13px] font-bold transition ${
        done ? "border-[#3F6E1E] bg-[#EEF4E2] text-[#3F6E1E]" : "border-[#E2D6C2] bg-white text-[#6E5F4E] hover:border-[#7AB648]"
      }`}
    >
      <span aria-hidden>{emoji}</span>{label} {count + (pressedNow ? 1 : 0)}
    </button>
  );
}
