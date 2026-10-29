"use client";

// 探す画面（B案）：ビーバーが1問ずつ聞き、答えるたびに電車が次の駅へ進む。
// 答えるたびに「候補◯院」が絞れていき、結果の医院は比べるリスト（最大3院）に入れて表で比べられる。
import { useEffect, useState } from "react";
import NewsletterSignup from "./NewsletterSignup";
import { CONSULT_ENABLED } from "@/lib/demo";
import { ACTIVE_PRIORITIES, BUDGETS, CATEGORIES, OPTIONS, PREFECTURES, formatPriceRange } from "@/lib/options";
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

/** 候補数を数えるための軽い医院データ（app/diagnosis/page.tsx で作って渡す） */
export interface CountClinic {
  prefecture: string;
  station_slug: string | null;
  t: { o: TreatmentOption; min: number }[];
}

const STOPS = ["治療", "希望", "予算", "エリア"];
const TOTAL = STOPS.length;
const PREFIX: Record<TreatmentCategory, string> = { whitening: "whitening_", orthodontics: "ortho_", implant: "implant_", cleaning: "cleaning_" };
const BUDGET_ICONS = ["💴", "💰", "💎", "👑"];
const COMPARE_KEY = "jihi-compare-v1";
const MAX_COMPARE = 3;

/** 回答の途中でも、いまの条件に合う医院の数を数える */
function countClinics(clinics: CountClinic[], a: Partial<Answers>) {
  return clinics.filter((c) => {
    if (a.station && c.station_slug !== a.station) return false;
    if (!a.station && a.prefecture && c.prefecture !== a.prefecture) return false;
    return c.t.some((t) =>
      (!a.category || t.o.startsWith(PREFIX[a.category])) &&
      (!a.option || t.o === a.option) &&
      (a.budgetMax == null || t.min <= a.budgetMax));
  }).length;
}

/**
 * initialStation：路線図で駅を押してから来た場合、その駅を選んだ状態で始める
 * initialCategory：トップの「ホワイトニング／矯正」ボタンから来た場合、2問目から始める
 */
export default function DiagnosisForm({ initialStation, initialCategory, clinics }: { initialStation?: string | null; initialCategory?: string | null; clinics: CountClinic[] }) {
  const preset = stationBySlug(initialStation);
  const presetCategory = CATEGORIES.find((c) => c.value === initialCategory)?.value;
  const initialAnswers: Answers = {
    ...(preset ? { prefecture: "東京都", station: preset.slug } : {}),
    ...(presetCategory ? { category: presetCategory } : {}),
    priorities: [],
  };
  const initialStep = presetCategory ? 1 : 0;
  const [step, setStep] = useState(initialStep);
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
      if (!res.ok) throw new Error((await res.json()).error ?? "検索に失敗しました");
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
    setStep(initialStep);
  }

  const total = clinics.length;
  // いまのステップまでに答えた条件だけで数える（戻ったときに先の回答で絞りすぎないため）
  const answered: Partial<Answers> = {
    category: answers.category,
    option: step >= 2 ? answers.option : undefined,
    budgetMax: step >= 3 ? answers.budgetMax : undefined,
    prefecture: step >= 3 ? answers.prefecture : undefined,
    station: step >= 3 ? answers.station : preset?.slug,
  };
  const candidates = countClinics(clinics, answered);

  if (matches) return <Results matches={matches} answers={answers} onRestart={restart} />;

  const { category } = answers;
  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label;
  const optionLabel = category && OPTIONS[category].find((o) => o.value === answers.option)?.label;
  const lines = [
    { img: "hi", text: preset ? `${preset.name}駅で探すんだね！どの治療が気になる？` : "やあ！どの治療が気になる？" },
    { img: "douzo", text: `${categoryLabel ?? ""}だね！希望に近いのはどれ？` },
    { img: "douzo", text: `${optionLabel ?? ""}だね！予算はどれくらい？` },
    { img: "search", text: "最後に、通いやすい場所を教えてね" },
  ];

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-10">
      <TrainProgress step={step} onBack={step > 0 ? back : undefined} />

      <BeaverSay img={lines[step].img}>{lines[step].text}</BeaverSay>

      {step === 0 && (
        <div className="space-y-3">
          {CATEGORIES.map((c) => (
            <Choice
              key={c.value}
              icon={c.icon}
              title={c.label}
              note={`${c.description}（${countClinics(clinics, { category: c.value, station: preset?.slug })}院）`}
              selected={category === c.value}
              // カテゴリを変えたら後続の回答はリセット
              onClick={() => pick("category", c.value, category !== c.value ? { option: undefined, budgetMax: undefined } : {})}
            />
          ))}
        </div>
      )}

      {step === 1 && category && (
        <div className="space-y-3">
          {OPTIONS[category].map((o) => (
            <Choice
              key={o.value}
              title={o.label}
              note={`${o.description}（${countClinics(clinics, { option: o.value, station: preset?.slug })}院）`}
              selected={answers.option === o.value}
              onClick={() => pick("option", o.value)}
            />
          ))}
        </div>
      )}

      {step === 2 && category && (
        <div className="space-y-3">
          {BUDGETS[category].map((b, i) => {
            const n = countClinics(clinics, { option: answers.option, budgetMax: b.value, station: preset?.slug });
            return (
              <Choice
                key={String(b.value)}
                icon={b.value === null ? "🤔" : BUDGET_ICONS[Math.min(i, BUDGET_ICONS.length - 1)]}
                title={b.label}
                note={b.value === null ? "料金のはばだけ見たい" : n > 0 ? `この予算から始められる医院 ${n}院` : "この予算から始められる医院はまだありません"}
                selected={answers.budgetMax === b.value}
                onClick={() => pick("budgetMax", b.value)}
              />
            );
          })}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <label className="block">
            <span className="mb-2 block font-bold">エリア</span>
            <select
              value={answers.prefecture ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, prefecture: e.target.value, station: null }))}
              className="w-full rounded-2xl border-2 border-[#E2D6C2] bg-white px-4 py-4 text-lg"
            >
              <option value="" disabled>
                都道府県を選ぶ
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
              <span className="mb-2 block font-bold">山手線の駅（えらばなくてもOK）</span>
              <select
                value={answers.station ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, station: e.target.value || null }))}
                className="w-full rounded-2xl border-2 border-[#E2D6C2] bg-white px-4 py-4 text-lg"
              >
                <option value="">こだわらない</option>
                {YAMANOTE.map((st) => (
                  <option key={st.slug} value={st.slug}>
                    {st.name}駅
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-sm text-[#6E5F4E]">選んだ駅と、山手線で近い駅の医院を先に出します</span>
            </label>
          )}

          <fieldset>
            <legend className="mb-2 font-bold">重視すること（いくつでも）</legend>
            <div className="flex flex-wrap gap-2">
              {ACTIVE_PRIORITIES.map((p) => {
                const on = answers.priorities.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePriority(p.value)}
                    className={`rounded-full border-2 px-4 py-2.5 font-bold transition ${
                      on ? "border-[#3F6E1E] bg-[#3F6E1E] text-white" : "border-[#E2D6C2] bg-white text-[#2B2118] hover:border-[#7AB648]"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <p className="text-red-700">{error}</p>}

          <button
            type="button"
            disabled={!answers.prefecture || loading}
            onClick={submit}
            className="w-full rounded-2xl bg-[#3F6E1E] py-4 text-lg font-bold text-white shadow-[0_3px_0_#2B4D14] transition hover:bg-[#355E19] disabled:cursor-not-allowed disabled:bg-[#C9BFAE] disabled:shadow-none"
          >
            {loading ? "さがしています…" : "🏁 条件に合う医院を見る"}
          </button>
        </div>
      )}

      <CandidateMeter count={candidates} total={total} />
    </div>
  );
}

/** 電車が駅を進んでいく進み具合（治療 → 希望 → 予算 → エリア → 結果） */
function TrainProgress({ step, onBack }: { step: number; onBack?: () => void }) {
  const stops = [...STOPS, "結果"];
  return (
    <div className="pt-4">
      <div className="mb-1 flex h-6 items-center justify-between">
        <span className="text-sm text-[#6E5F4E]">
          {step + 1} / {TOTAL} 問目
        </span>
        {onBack && (
          <button type="button" onClick={onBack} className="text-sm font-bold text-[#3F6E1E] hover:underline">
            ← ひとつ前へ
          </button>
        )}
      </div>
      <div className="relative flex items-center justify-between" aria-hidden>
        <div className="absolute inset-x-3 top-1/2 h-1.5 -translate-y-1/2 rounded bg-[#E8E0D2]" />
        <div
          className="absolute left-3 top-1/2 h-1.5 -translate-y-1/2 rounded bg-[repeating-linear-gradient(90deg,#7AB648_0_12px,#B7D98F_12px_18px)] transition-all duration-500"
          style={{ width: `calc((100% - 1.5rem) * ${step / (stops.length - 1)})` }}
        />
        {stops.map((s, i) => (
          <span
            key={s}
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-[3px] text-xs font-bold ${
              i < step ? "border-[#7AB648] bg-[#7AB648] text-white" : i === step ? "border-[#3F6E1E] bg-white text-[#3F6E1E]" : "border-[#D8CBB6] bg-white text-[#B0A08A]"
            }`}
          >
            {i === step ? "🚃" : i === stops.length - 1 ? "🏁" : i + 1}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-[#6E5F4E]">
        {stops.map((s) => (
          <span key={s} className="w-10 text-center">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function BeaverSay({ img, children }: { img: string; children: React.ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/beaver/${img}.png`} alt="案内役のビーバー" width={96} height={112} className="h-28 w-24 flex-none object-contain" />
      <p className="relative rounded-2xl border-2 border-[#2B2118] bg-white px-4 py-3 text-lg font-bold leading-snug">{children}</p>
    </div>
  );
}

function Choice({ icon, title, note, selected, onClick }: { icon?: string; title: string; note?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
        selected ? "border-[#3F6E1E] bg-[#F2F8EA]" : "border-[#E2D6C2] bg-white hover:border-[#7AB648]"
      }`}
    >
      {icon && <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#F3ECE0] text-2xl">{icon}</span>}
      <span>
        <span className="block text-lg font-bold">{title}</span>
        {note && <span className="block text-sm text-[#6E5F4E]">{note}</span>}
      </span>
    </button>
  );
}

/** 答えるたびに減っていく「候補◯院」 */
function CandidateMeter({ count, total }: { count: number; total: number }) {
  if (total === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-[#EADFCF] bg-white p-4">
      <p className="text-sm text-[#6E5F4E]">答えるたびに候補が絞れていきます</p>
      <p className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-[#B4471C] tabular-nums">{count}</span>
        <span className="font-bold">院が候補</span>
        <span className="text-sm text-[#6E5F4E]">（{total}院中）</span>
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EFE7DA]">
        <div className="h-full rounded-full bg-[#7AB648] transition-all duration-500" style={{ width: `${(count / total) * 100}%` }} />
      </div>
    </div>
  );
}

type CompareItem = Pick<ClinicMatch, "clinic" | "treatment">;

/** 比べるリスト（最大3院）。ページを移っても消えないよう、この端末のブラウザに保存する */
function useCompare() {
  const [items, setItems] = useState<CompareItem[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPARE_KEY) ?? "[]");
      if (Array.isArray(saved)) setItems(saved.slice(0, MAX_COMPARE));
    } catch {
      // 保存できない環境（プライベートブラウズ等）ではその場だけ覚える
    }
  }, []);
  const save = (next: CompareItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
    } catch {}
  };
  const has = (id: string) => items.some((x) => x.clinic.id === id);
  const toggle = (m: CompareItem) => {
    if (has(m.clinic.id)) save(items.filter((x) => x.clinic.id !== m.clinic.id));
    else if (items.length < MAX_COMPARE) save([...items, { clinic: m.clinic, treatment: m.treatment }]);
  };
  return { items, has, toggle, full: items.length >= MAX_COMPARE, clear: () => save([]) };
}

function Results({ matches, answers, onRestart }: { matches: ClinicMatch[]; answers: Answers; onRestart: () => void }) {
  const optionLabel = answers.category && OPTIONS[answers.category].find((o) => o.value === answers.option)?.label;
  const budgetLabel = answers.category && BUDGETS[answers.category].find((b) => b.value === answers.budgetMax)?.label;
  const compare = useCompare();
  const [showCompare, setShowCompare] = useState(false);
  const area = answers.station ? `${stationBySlug(answers.station)?.name}駅周辺` : answers.prefecture;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-32 pt-4">
      <TrainProgress step={TOTAL} />
      <BeaverSay img={matches.length ? "sit" : "search"}>
        {matches.length ? `条件に合う医院が${matches.length}院見つかったよ！♡で比べるリストに入れてね` : "ごめんね、条件に合う医院が見つからなかったよ"}
      </BeaverSay>
      <p className="mb-4 rounded-xl bg-white px-3 py-2 text-sm text-[#6E5F4E]">
        {optionLabel}／予算{budgetLabel}／{area}
      </p>

      {matches.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-[#6E5F4E]">予算やエリアを変えて、もう一度さがしてみてください。</div>
      ) : (
        <>
          <p className="mb-4 rounded-xl bg-[#F3ECE0] p-3 text-sm leading-relaxed text-[#5A4A3A]">
            並び順は、ご予算・エリア・重視することとの一致度だけで決めています。口コミ評価や掲載料は使っていません。医院の優劣を示すものではありません。
          </p>
          <ol className="space-y-4">
            {matches.map((m) => {
              const inList = compare.has(m.clinic.id);
              return (
                <li key={m.clinic.id} className="rounded-3xl border border-[#EADFCF] bg-white p-5 shadow-[0_2px_0_#EADFCF]">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">{m.clinic.name}</h3>
                      <p className="text-[#6E5F4E]">
                        {m.clinic.nearest_station} 徒歩{m.clinic.walk_minutes}分
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={inList}
                      disabled={!inList && compare.full}
                      onClick={() => compare.toggle(m)}
                      className={`flex-none rounded-full border-2 px-3 py-2 text-sm font-bold transition disabled:opacity-40 ${
                        inList ? "border-[#B4471C] bg-[#B4471C] text-white" : "border-[#E2D6C2] bg-white text-[#B4471C]"
                      }`}
                    >
                      {inList ? "♥ 比べる" : "♡ 比べる"}
                    </button>
                  </div>

                  <p className="mb-3 text-[#3D3128]">{m.clinic.catch_copy}</p>

                  <div className="mb-3 rounded-2xl bg-[#FFF5E8] p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-[#6E5F4E]">費用の目安</span>
                      <span className="text-xl font-bold text-[#B4471C]">
                        {formatPriceRange(m.treatment.price_min, m.treatment.price_max)}
                        {!m.withinBudget && <span className="ml-2 text-sm text-orange-700">予算オーバー</span>}
                      </span>
                    </div>
                    {m.treatment.price_note && <p className="mt-1 text-right text-xs text-[#6E5F4E]">{m.treatment.price_note}</p>}
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-[#6E5F4E]">期間の目安</span>
                      <span>{m.treatment.duration_label}</span>
                    </div>
                  </div>

                  {m.reasons.length > 0 && (
                    <ul className="mb-4 space-y-1 text-[#3D3128]">
                      {m.reasons.map((r) => (
                        <li key={r}>✓ {r}</li>
                      ))}
                    </ul>
                  )}

                  {CONSULT_ENABLED && (
                    <a
                      href={`/consult?clinic=${m.clinic.slug}`}
                      className="mb-2 block rounded-2xl bg-[#0B6E63] py-3 text-center font-bold text-white hover:bg-[#08534B]"
                    >
                      行く前に先生へオンライン相談（無料）
                    </a>
                  )}
                  <a
                    href={m.clinic.booking_url ?? `/clinics/${m.clinic.slug}`}
                    className="block rounded-2xl border-2 border-[#3F6E1E] py-3 text-center font-bold text-[#3F6E1E] hover:bg-[#F2F8EA]"
                  >
                    {m.clinic.booking_url ? "カウンセリングを予約する" : "料金の出典と医院の詳細を見る"}
                  </a>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {showCompare && compare.items.length > 0 && <CompareTable items={compare.items} onClose={() => setShowCompare(false)} />}

      <p className="mt-6 text-xs leading-relaxed text-[#8A7A66]">
        ※表示している費用は、各医院の公式サイトに掲載された自費診療の目安です（税込と明記のないものは記載額のまま）。実際の金額は診察・検査の結果により異なり、最新の金額は医院にご確認ください。自費診療のため公的医療保険は適用されません。この結果は費用と条件の比較であり、診断ではありません。
      </p>

      <div className="mt-6">
        <NewsletterSignup interest={answers.category} prefecture={answers.prefecture} />
      </div>

      <button type="button" onClick={onRestart} className="mt-6 w-full rounded-2xl border-2 border-[#D8CBB6] bg-white py-3 font-bold text-[#3D3128] hover:bg-[#F7F2E8]">
        条件を変えてさがす
      </button>

      {compare.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-3xl bg-[#2B2118] px-4 py-3 text-white shadow-lg">
            <div className="min-w-0">
              <p className="font-bold">
                比べるリスト <span className="text-[#FFD58A]">{compare.items.length}院</span>
                <span className="ml-1 text-xs font-normal text-[#D9CDBB]">（最大{MAX_COMPARE}院）</span>
              </p>
              <p className="truncate text-xs text-[#D9CDBB]">{compare.items.map((x) => x.clinic.name).join("・")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCompare(true);
                setTimeout(() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" }), 0);
              }}
              className="flex-none rounded-2xl bg-[#FFD58A] px-4 py-2.5 font-bold text-[#2B2118]"
            >
              表で比べる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 比べるリストの医院を横に並べる表 */
function CompareTable({ items, onClose }: { items: CompareItem[]; onClose: () => void }) {
  const rows: { label: string; value: (x: CompareItem) => React.ReactNode }[] = [
    { label: "費用の目安", value: (x) => <b className="text-[#B4471C]">{formatPriceRange(x.treatment.price_min, x.treatment.price_max)}</b> },
    { label: "期間", value: (x) => x.treatment.duration_label },
    { label: "駅から", value: (x) => `${x.clinic.nearest_station} 徒歩${x.clinic.walk_minutes}分` },
    { label: "注意", value: (x) => x.treatment.price_note ?? "—" },
    {
      label: "出典",
      value: (x) =>
        x.treatment.source_url ? (
          <a href={x.treatment.source_url} target="_blank" rel="noopener nofollow" className="underline">
            公式サイト
          </a>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <section id="compare" className="mt-8 scroll-mt-4 rounded-3xl border-2 border-[#3F6E1E] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">比べるリスト</h3>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[#3F6E1E]">
          閉じる
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr>
              <th className="w-20" />
              {items.map((x) => (
                <th key={x.clinic.id} className="p-2 text-left align-bottom font-bold">
                  <a href={`/clinics/${x.clinic.slug}`} className="underline">
                    {x.clinic.name}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-[#EADFCF] align-top">
                <th className="p-2 text-left font-normal text-[#6E5F4E]">{r.label}</th>
                {items.map((x) => (
                  <td key={x.clinic.id} className="p-2">
                    {r.value(x)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
