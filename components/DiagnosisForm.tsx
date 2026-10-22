"use client";

import { useState } from "react";
import NewsletterSignup from "./NewsletterSignup";
import { BUDGETS, CATEGORIES, OPTIONS, PREFECTURES, PRIORITIES, formatPrice } from "@/lib/options";
import { YAMANOTE, stationBySlug } from "@/lib/yamanote";
import type { ClinicMatch, Priority, TreatmentCategory, TreatmentOption } from "@/lib/types";

type Answers = {
  category?: TreatmentCategory;
  option?: TreatmentOption;
  budgetMax?: number | null; // undefined = 未回答、null =「こだわらない」
  prefecture?: string;
  station?: string | null; // 山手線の駅（東京都のときだけ）
  priorities: Priority[];
};

const STEP_TITLES = ["どの治療に興味がありますか？", "ご希望に近いものは？", "ご予算はどのくらいですか？", "通いたいエリアと重視することは？"];
const TOTAL = STEP_TITLES.length;

/** initialStation：路線図で駅を押してから来た場合、その駅を選んだ状態で始める */
export default function DiagnosisForm({ initialStation }: { initialStation?: string | null }) {
  const preset = stationBySlug(initialStation);
  const initialAnswers: Answers = preset ? { prefecture: "東京都", station: preset.slug, priorities: [] } : { priorities: [] };
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [matches, setMatches] = useState<ClinicMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // 1つ選ぶだけのステップは選んだら自動で次へ
  const pick = <K extends keyof Answers>(key: K, value: Answers[K], reset?: Partial<Answers>) => {
    setAnswers((a) => ({ ...a, ...reset, [key]: value }));
    next();
  };

  const togglePriority = (p: Priority) =>
    setAnswers((a) => ({
      ...a,
      priorities: a.priorities.includes(p) ? a.priorities.filter((x) => x !== p) : [...a.priorities, p],
    }));

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answers,
          utm: {
            source: params.get("utm_source") ?? undefined,
            medium: params.get("utm_medium") ?? undefined,
            campaign: params.get("utm_campaign") ?? undefined,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "診断に失敗しました");
      setMatches((await res.json()).matches);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setAnswers(initialAnswers);
    setMatches(null);
    setStep(0);
  }

  if (matches) return <Results matches={matches} answers={answers} onRestart={restart} />;

  const { category } = answers;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      {/* 進捗バー */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm text-gray-500">
          <span>
            STEP {step + 1} / {TOTAL}
          </span>
          {step > 0 && (
            <button type="button" onClick={back} className="text-sky-600 hover:underline">
              ← 戻る
            </button>
          )}
        </div>
        <div className="h-2 rounded-full bg-gray-100">
          <div className="h-2 rounded-full bg-sky-500 transition-all" style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
        </div>
      </div>

      <h2 className="mb-5 text-xl font-bold text-gray-900">{STEP_TITLES[step]}</h2>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <Choice
              key={c.value}
              selected={category === c.value}
              // カテゴリを変えたら後続の回答はリセット
              onClick={() => pick("category", c.value, category !== c.value ? { option: undefined, budgetMax: undefined } : {})}
            >
              <span className="mb-1 block text-2xl">{c.icon}</span>
              <span className="block font-bold">{c.label}</span>
              <span className="block text-xs text-gray-500">{c.description}</span>
            </Choice>
          ))}
        </div>
      )}

      {step === 1 && category && (
        <div className="space-y-3">
          {OPTIONS[category].map((o) => (
            <Choice key={o.value} selected={answers.option === o.value} onClick={() => pick("option", o.value)}>
              <span className="block font-bold">{o.label}</span>
              <span className="block text-sm text-gray-500">{o.description}</span>
            </Choice>
          ))}
        </div>
      )}

      {step === 2 && category && (
        <div className="grid grid-cols-2 gap-3">
          {BUDGETS[category].map((b) => (
            <Choice key={String(b.value)} selected={answers.budgetMax === b.value} onClick={() => pick("budgetMax", b.value)}>
              <span className="block text-center font-bold">{b.label}</span>
            </Choice>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-700">エリア</span>
            <select
              value={answers.prefecture ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, prefecture: e.target.value, station: null }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3"
            >
              <option value="" disabled>
                都道府県を選択
              </option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {answers.prefecture === "東京都" && (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-gray-700">山手線の駅（任意）</span>
              <select
                value={answers.station ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, station: e.target.value || null }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3"
              >
                <option value="">こだわらない</option>
                {YAMANOTE.map((st) => (
                  <option key={st.slug} value={st.slug}>
                    {st.name}駅
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gray-500">選んだ駅と、山手線で近い駅の医院を優先して提案します</span>
            </label>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-gray-700">重視すること（複数選択可）</legend>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => {
                const on = answers.priorities.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePriority(p.value)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      on ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-300 bg-white text-gray-700 hover:border-sky-300"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!answers.prefecture || loading}
            onClick={submit}
            className="w-full rounded-xl bg-sky-600 py-4 font-bold text-white shadow transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? "検索中…" : "条件に合う医院を見る"}
          </button>
        </div>
      )}
    </div>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-4 text-left transition ${
        selected ? "border-sky-500 bg-sky-50" : "border-gray-200 bg-white hover:border-sky-300"
      }`}
    >
      {children}
    </button>
  );
}

function Results({ matches, answers, onRestart }: { matches: ClinicMatch[]; answers: Answers; onRestart: () => void }) {
  const optionLabel = answers.category && OPTIONS[answers.category].find((o) => o.value === answers.option)?.label;
  const budgetLabel = answers.category && BUDGETS[answers.category].find((b) => b.value === answers.budgetMax)?.label;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <p className="text-sm text-gray-500">検索結果</p>
      <h2 className="mb-1 text-xl font-bold text-gray-900">ご希望の条件に合う歯科医院</h2>
      <p className="mb-6 text-sm text-gray-600">
        {optionLabel}／予算{budgetLabel}／{answers.station ? `${stationBySlug(answers.station)?.name}駅周辺` : answers.prefecture}
      </p>

      {matches.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
          条件に合う医院が見つかりませんでした。予算やエリアを変えてお試しください。
        </div>
      ) : (
        <>
        <p className="mb-4 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
          並び順は、ご予算・エリア・重視することとの一致度だけで決めています。口コミ評価や掲載料は使っていません。医院の優劣を示すものではありません。
        </p>
        <ol className="space-y-4">
          {matches.map((m, i) => (
            <li key={m.clinic.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-sky-600">候補 {i + 1}</span>
                  <h3 className="text-lg font-bold text-gray-900">{m.clinic.name}</h3>
                  <p className="text-sm text-gray-500">
                    {m.clinic.prefecture}
                    {m.clinic.city}・{m.clinic.nearest_station} 徒歩{m.clinic.walk_minutes}分
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-2xl font-bold text-sky-600">{m.score}</span>
                  <span className="text-xs text-gray-500">条件の一致度</span>
                </div>
              </div>

              <p className="mb-3 text-sm text-gray-700">{m.clinic.catch_copy}</p>

              <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">費用の目安</span>
                  <span className="font-bold">
                    {formatPrice(m.treatment.price_min)}〜{formatPrice(m.treatment.price_max)}
                    {!m.withinBudget && <span className="ml-2 text-xs text-orange-600">予算オーバー</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">期間の目安</span>
                  <span>{m.treatment.duration_label}</span>
                </div>
              </div>

              {m.reasons.length > 0 && (
                <ul className="mb-4 space-y-1 text-sm text-gray-700">
                  {m.reasons.map((r) => (
                    <li key={r}>✓ {r}</li>
                  ))}
                </ul>
              )}

              <a
                href={`/consult?clinic=${m.clinic.slug}`}
                className="block rounded-xl bg-[#0B6E63] py-3 text-center font-bold text-white hover:bg-[#08534B]"
              >
                行く前に先生へオンライン相談（無料）
              </a>
              <a
                href={m.clinic.booking_url ?? `/clinics/${m.clinic.slug}`}
                className="mt-2 block rounded-xl border border-gray-300 py-3 text-center text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                カウンセリングを予約する
              </a>
            </li>
          ))}
        </ol>
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-gray-400">
        ※表示している費用は、各医院の公式サイトに掲載された自費診療の目安（税込）です。実際の金額は診察・検査の結果により異なり、最新の金額は医院にご確認ください。自費診療のため公的医療保険は適用されません。この結果は費用と条件の比較であり、診断ではありません。
      </p>

      <div className="mt-6">
        <NewsletterSignup interest={answers.category} prefecture={answers.prefecture} />
      </div>

      <button type="button" onClick={onRestart} className="mt-6 w-full rounded-xl border border-gray-300 py-3 text-gray-700 hover:bg-gray-50">
        条件を変えて探す
      </button>
    </div>
  );
}
