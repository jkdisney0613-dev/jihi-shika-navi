"use client";

// オンライン相談：悩みを選ぶ → 費用の目安 → 担当医を選ぶ（最大3院） → 写真と相談内容 → 連絡先 → 送信
import { useMemo, useState } from "react";
import { CONCERNS, MAX_CLINICS_PER_CONSULT, MAX_PHOTOS, candidatesFor, estimate, type Concern } from "@/lib/consult";
import type { ConsultClinic } from "@/lib/consult-data";
import { BUDGETS, OPTIONS, PRIORITIES, formatPrice } from "@/lib/options";
import type { TreatmentOption } from "@/lib/types";

const STEPS = ["お悩み", "費用の目安", "先生を選ぶ", "写真と相談内容", "連絡先"];
const AGE_RANGES = ["10代", "20代", "30代", "40代", "50代以上"];
const optionLabel = (o: TreatmentOption) => Object.values(OPTIONS).flat().find((x) => x.value === o)?.label ?? o;

export default function ConsultForm({ clinics, initialClinic, demo = false }: { clinics: ConsultClinic[]; initialClinic?: string | null; demo?: boolean }) {
  const preset = clinics.find((c) => c.clinic.slug === initialClinic);
  const [step, setStep] = useState(0);
  const [concern, setConcern] = useState<Concern | null>(null);
  const [option, setOption] = useState<TreatmentOption | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  // clinicId → doctorId（null は担当医の指定なし）
  const [picks, setPicks] = useState<Record<string, string | null>>(preset ? { [preset.clinic.id]: preset.doctors[0]?.id ?? null } : {});
  const [photos, setPhotos] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [wishes, setWishes] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const category = CONCERNS.find((c) => c.value === concern)?.category ?? "orthodontics";
  const estimates = useMemo(() => (concern ? estimate(concern, clinics.map((c) => c.clinic)) : []), [concern, clinics]);
  const available = useMemo(
    () =>
      clinics
        .filter((c) => !option || c.clinic.treatments.some((t) => t.option_code === option))
        .sort((a, b) => b.clinic.rating - a.clinic.rating),
    [clinics, option],
  );
  const pickedIds = Object.keys(picks);

  function togglePick(cc: ConsultClinic) {
    setPicks((p) => {
      if (cc.clinic.id in p) {
        const { [cc.clinic.id]: _, ...rest } = p;
        return rest;
      }
      if (Object.keys(p).length >= MAX_CLINICS_PER_CONSULT) return p;
      const doctor = cc.doctors.find((d) => option && d.specialties.includes(option)) ?? cc.doctors[0];
      return { ...p, [cc.clinic.id]: doctor?.id ?? null };
    });
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const ok = [...files].filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);
    if (ok.length < files.length) setError("5MBまでの画像だけ添付できます");
    setPhotos((p) => [...p, ...ok].slice(0, MAX_PHOTOS));
  }

  async function submit() {
    setSending(true);
    setError(null);
    try {
      let photoPaths: string[] = [];
      if (photos.length && !demo) {
        const res = await fetch("/api/consult/photo-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ types: photos.map((f) => f.type) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await Promise.all(
          (data.uploads as { path: string; url: string }[]).map(async (u, i) => {
            const up = await fetch(u.url, { method: "PUT", headers: { "content-type": photos[i].type, "x-upsert": "false" }, body: photos[i] });
            if (!up.ok) throw new Error("写真を送れませんでした。写真なしでも相談できます");
          }),
        );
        photoPaths = data.uploads.map((u: { path: string }) => u.path);
      }
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concern,
          option,
          budgetMax,
          picks: Object.entries(picks).map(([clinicId, doctorId]) => ({ clinicId, doctorId })),
          photoPaths,
          note,
          wishes,
          name,
          email,
          ageRange: ageRange || null,
          consent,
          utm: { source: params.get("utm_source") ?? undefined, medium: params.get("utm_medium") ?? undefined, campaign: params.get("utm_campaign") ?? undefined },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError((e as Error).message || "送信できませんでした。時間をおいてもう一度お試しください");
    } finally {
      setSending(false);
    }
  }

  if (done && demo) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-4xl" aria-hidden="true">🙏</p>
        <h2 className="mt-3 text-xl font-black">ありがとうございます</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          このサービスは現在テスト公開中で、相談はまだ医院に届きません。オンライン相談が始まったら <strong>{email}</strong> にお知らせします。
        </p>
        <p className="mt-4 text-xs text-gray-500">お知らせ以外の目的でメールアドレスを使うことはありません。</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-4xl" aria-hidden="true">✉️</p>
        <h2 className="mt-3 text-xl font-black">相談を送りました</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          選んだ医院の先生から、概算費用とひとことが <strong>{email}</strong> に届きます。受付メールもお送りしました。
        </p>
        <p className="mt-4 text-xs text-gray-500">返信の内容は検査前の目安です。気になる先生がいたら、そのままカウンセリングを予約できます。</p>
      </div>
    );
  }

  const canNext = [!!concern, !!option, pickedIds.length > 0, true, !!name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && consent][step];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5">
      <ol className="flex gap-1" aria-label="進み具合">
        {STEPS.map((s, i) => (
          <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[#0B6E63]" : "bg-gray-200"}`} aria-current={i === step ? "step" : undefined}>
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs font-bold text-[#0B6E63]">{step + 1} / {STEPS.length}　{STEPS[step]}</p>

      {step === 0 && (
        <section>
          <h2 className="mt-1 text-lg font-black">いちばん近いお悩みは？</h2>
          <p className="mt-1 text-sm text-gray-600">写真がなくても大丈夫です。</p>
          <p className="mt-4 text-xs font-bold text-gray-500">歯並び（矯正）</p>
          <ConcernGrid items={CONCERNS.filter((c) => c.category === "orthodontics")} value={concern} onPick={(c) => { setConcern(c); setOption(null); setStep(1); }} />
          <p className="mt-4 text-xs font-bold text-gray-500">歯の色（ホワイトニング）</p>
          <ConcernGrid items={CONCERNS.filter((c) => c.category === "whitening")} value={concern} onPick={(c) => { setConcern(c); setOption(null); setStep(1); }} />
        </section>
      )}

      {step === 1 && concern && (
        <section>
          <h2 className="mt-1 text-lg font-black">考えられる治療と、総額の目安</h2>
          <p className="mt-1 text-sm text-gray-600">相談したい治療を1つ選んでください。迷ったら一番上で大丈夫です。</p>
          <div className="mt-4 space-y-2">
            {estimates.map((e) => (
              <button
                key={e.option}
                type="button"
                aria-pressed={option === e.option}
                onClick={() => setOption(e.option)}
                className={`w-full rounded-2xl border p-4 text-left ${option === e.option ? "border-2 border-[#0B6E63] bg-[#E7F4F2]" : "border-gray-200"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{optionLabel(e.option)}</span>
                  <span className="whitespace-nowrap font-black text-[#B54708]">{formatPrice(e.min)}〜{formatPrice(e.max)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {e.source === "clinics" ? "相談できる医院の公式料金から" : "一般的な相場から"}
                  {e.extra && `・検査や調整などで +${formatPrice(e.extra[0])}〜${formatPrice(e.extra[1])} かかることがあります`}
                </div>
              </button>
            ))}
          </div>
          {candidatesFor(concern).caution && (
            <p className="mt-3 rounded-xl bg-[#FFF6E5] p-3 text-xs leading-relaxed text-[#7A4A00]">{candidatesFor(concern).caution}最終的な治療方針は、来院時の検査で決まります。</p>
          )}
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-bold">ご予算（任意）</span>
            <select value={budgetMax ?? ""} onChange={(e) => setBudgetMax(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-xl border border-gray-300 px-3 py-3">
              <option value="">決めていない</option>
              {BUDGETS[category].filter((b) => b.value).map((b) => <option key={b.label} value={b.value!}>{b.label}</option>)}
            </select>
          </label>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="mt-1 text-lg font-black">相談したい先生を選ぶ</h2>
          <p className="mt-1 text-sm text-gray-600">
            {MAX_CLINICS_PER_CONSULT}院まで同時に送れます。行く前に、誰が診てくれるのかを決められます。
          </p>
          <div className="mt-4 space-y-3">
            {available.length === 0 && <p className="text-sm text-gray-500">この治療でオンライン相談を受け付けている医院はまだありません。</p>}
            {available.map((cc) => {
              const picked = cc.clinic.id in picks;
              const t = cc.clinic.treatments.find((x) => x.option_code === option);
              return (
                <div key={cc.clinic.id} className={`rounded-2xl border p-4 ${picked ? "border-2 border-[#0B6E63]" : "border-gray-200"}`}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={picked} onChange={() => togglePick(cc)} disabled={!picked && pickedIds.length >= MAX_CLINICS_PER_CONSULT} className="mt-1 h-5 w-5 flex-none accent-[#0B6E63]" />
                    <span className="flex-1">
                      <span className="block font-bold">{cc.clinic.name}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {cc.clinic.nearest_station} 徒歩{cc.clinic.walk_minutes}分・★{cc.clinic.rating.toFixed(1)}（{cc.clinic.review_count}件）
                      </span>
                      {t && <span className="mt-1 block text-sm font-bold text-[#B54708]">{formatPrice(t.price_min)}〜{formatPrice(t.price_max)}<span className="ml-1 text-xs font-normal text-gray-500">{t.duration_label}</span></span>}
                    </span>
                  </label>
                  {picked && (
                    <fieldset className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <legend className="sr-only">担当医</legend>
                      {cc.doctors.map((d) => (
                        <label key={d.id} className={`flex cursor-pointer gap-3 rounded-xl p-3 ${picks[cc.clinic.id] === d.id ? "bg-[#E7F4F2]" : "bg-gray-50"}`}>
                          <input type="radio" name={`doctor-${cc.clinic.id}`} checked={picks[cc.clinic.id] === d.id} onChange={() => setPicks((p) => ({ ...p, [cc.clinic.id]: d.id }))} className="mt-1 h-4 w-4 flex-none accent-[#0B6E63]" />
                          <span className="text-sm">
                            <span className="font-bold">{d.name} 先生</span>
                            <span className="ml-1 text-xs text-gray-500">{d.role}{d.years ? `・歯科医師${d.years}年目` : ""}</span>
                            {d.credentials.map((c) => (
                              <span key={c} className="ml-1 inline-block rounded-md bg-[#EEF2FF] px-1.5 py-0.5 text-[11px] font-bold text-[#1E3A8A]">{c}</span>
                            ))}
                            {d.days && <span className="mt-0.5 block text-xs text-gray-500">担当：{d.days}</span>}
                            {d.message && <span className="mt-1 block text-xs text-gray-700">「{d.message}」</span>}
                          </span>
                        </label>
                      ))}
                      <label className={`flex cursor-pointer gap-3 rounded-xl p-3 text-sm ${picks[cc.clinic.id] === null ? "bg-[#E7F4F2]" : "bg-gray-50"}`}>
                        <input type="radio" name={`doctor-${cc.clinic.id}`} checked={picks[cc.clinic.id] === null} onChange={() => setPicks((p) => ({ ...p, [cc.clinic.id]: null }))} className="mt-0.5 h-4 w-4 accent-[#0B6E63]" />
                        先生の指定なし
                      </label>
                    </fieldset>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            ここに出ているのは、オンライン相談を受け付けている提携医院です（医院から相談1件ごとに手数料をいただいています）。並び順は口コミ評価順で、手数料は関係ありません。資格は医院の申告に基づきます。
          </p>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="mt-1 text-lg font-black">写真と相談したいこと（任意）</h2>
          <p className="mt-1 text-sm text-gray-600">口元の写真があると、先生が概算を出しやすくなります。正面・上の歯・下の歯・横から、など{MAX_PHOTOS}枚まで。</p>
          {demo ? (
            <p className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">テスト公開中のため、写真の受付はまだ行っていません。</p>
          ) : (<>
          <label className="mt-3 flex h-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-sm text-gray-600">
            写真を選ぶ（{photos.length}/{MAX_PHOTOS}）
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
          </label>
          {photos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {photos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs">
                  {f.name.slice(0, 18)}
                  <button type="button" aria-label={`${f.name} を外す`} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="ml-1 text-gray-500">×</button>
                </li>
              ))}
            </ul>
          )}
          </>)}
          <p className="mt-4 text-sm font-bold">重視すること</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRIORITIES.map((p) => {
              const on = wishes.includes(p.label);
              return (
                <button key={p.value} type="button" aria-pressed={on} onClick={() => setWishes((w) => (on ? w.filter((x) => x !== p.label) : [...w, p.label]))} className={`rounded-full px-3 py-2 text-sm ${on ? "bg-[#0B6E63] text-white" : "bg-gray-100"}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-bold">先生に聞きたいこと</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1000} placeholder="例：前に行った医院では抜歯が必要と言われました。マウスピースで治せますか？" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h2 className="mt-1 text-lg font-black">返信を受け取る連絡先</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">お名前（ニックネーム可）</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoComplete="nickname" className="w-full rounded-xl border border-gray-300 px-3 py-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">メールアドレス</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" className="w-full rounded-xl border border-gray-300 px-3 py-3" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">年代（任意）</span>
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-3">
              <option value="">選ばない</option>
              {AGE_RANGES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex gap-3 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#0B6E63]" />
            {demo ? (
              <span>
                テスト公開中のため、相談は医院には送られません。入力内容をサービス改善に使い、オンライン相談の開始時にメールでお知らせを受け取ることに同意します。<a href="/privacy" className="underline">プライバシーポリシー</a>
              </span>
            ) : (
              <span>
                入力した内容と写真（歯の状態など健康に関する情報を含みます）を、選んだ医院（{pickedIds.length}院）に提供することに同意します。メールアドレスは医院には渡さず、医院からの返信は当サイトからお届けします。<a href="/privacy" className="underline">プライバシーポリシー</a>
              </span>
            )}
          </label>
          <p className="text-[11px] text-gray-500">相談は無料です。レントゲンや口腔内を見ていないため、返信は目安で、診断ではありません。</p>
        </section>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="h-12 flex-1 rounded-xl border border-gray-300 font-bold">
            戻る
          </button>
        )}
        {step > 0 && step < STEPS.length - 1 && (
          <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="h-12 flex-[2] rounded-xl bg-[#0B6E63] font-bold text-white disabled:opacity-40">
            {step === 3 && !photos.length && !note ? "スキップして次へ" : "次へ"}
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button type="button" disabled={!canNext || sending} onClick={submit} className="h-12 flex-[2] rounded-xl bg-[#0B6E63] font-bold text-white disabled:opacity-40">
            {sending ? "送信中…" : `${pickedIds.length}院に無料で相談する`}
          </button>
        )}
      </div>
    </div>
  );
}

function ConcernGrid({ items, value, onPick }: { items: typeof CONCERNS; value: Concern | null; onPick: (c: Concern) => void }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {items.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-pressed={value === c.value}
          onClick={() => onPick(c.value)}
          className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-3 text-xs ${value === c.value ? "border-2 border-[#0B6E63] bg-[#E7F4F2] font-bold text-[#0B5A51]" : "border border-gray-300"}`}
        >
          <TeethIcon concern={c.value} />
          {c.label}
        </button>
      ))}
    </div>
  );
}

/** 歯並びのタイプを示す小さなイラスト（デザイン案の AI問診画面と同じ形） */
function TeethIcon({ concern }: { concern: Concern }) {
  const tooth = (x: number, y: number, h: number, r = 0, key?: string) => (
    <rect key={key ?? `${x}`} x={x} y={y} width="8.5" height={h} rx="3" fill="#fff" stroke="#15202B" strokeWidth="1.5" transform={r ? `rotate(${r} ${x + 4} ${y + h / 2})` : undefined} />
  );
  const shapes: Record<Concern, React.ReactNode> = {
    crowding: [tooth(8, 8, 14, -10, "a"), tooth(17, 6, 16, 8, "b"), tooth(27, 7, 16, -12, "c"), tooth(38, 8, 14, 6, "d")],
    protrusion: [tooth(8, 10, 13, 0, "a"), tooth(18, 4, 17, -14, "b"), tooth(29, 4, 17, 14, "c"), tooth(40, 10, 13, 0, "d")],
    gap: [tooth(4, 8, 14, 0, "a"), tooth(17, 6, 16, 0, "b"), tooth(31, 6, 16, 0, "c"), tooth(44, 8, 14, 0, "d")],
    underbite: [<rect key="u" x="10" y="2" width="36" height="10" rx="3" fill="#fff" stroke="#9CA3AF" strokeWidth="1.5" />, <rect key="l" x="6" y="14" width="44" height="11" rx="3" fill="#fff" stroke="#15202B" strokeWidth="1.5" />],
    few_teeth: [tooth(8, 8, 14, 0, "a"), tooth(18, 6, 16, 0, "b"), tooth(29, 6, 16, 10, "c"), tooth(40, 8, 14, 0, "d")],
    unknown: [<circle key="c" cx="28" cy="14" r="10" fill="none" stroke="#15202B" strokeWidth="1.5" />, <path key="q" d="M28 9v6M28 18v1" stroke="#15202B" strokeWidth="1.5" strokeLinecap="round" />],
    stain: [tooth(10, 6, 16, 0, "a"), tooth(20, 6, 16, 0, "b"), tooth(30, 6, 16, 0, "c"), <circle key="s" cx="25" cy="16" r="3" fill="#E8C77A" />],
    event: [<path key="sp" d="M28 4l2.5 6.5L37 13l-6.5 2.5L28 22l-2.5-6.5L19 13l6.5-2.5z" fill="none" stroke="#15202B" strokeWidth="1.5" />],
  };
  return (
    <svg width="56" height="28" viewBox="0 0 56 28" aria-hidden="true">
      {shapes[concern]}
    </svg>
  );
}
