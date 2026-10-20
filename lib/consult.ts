// オンライン相談：歯並びの悩み → 費用の目安 → 担当医を選ぶ、で使う定義と計算
// ここで出すのは一般的な費用の目安で、診断ではない（レントゲン・口腔内を見ずに治療方針は決められない）
import type { Clinic, TreatmentOption } from "./types";

export type Concern = "crowding" | "protrusion" | "gap" | "underbite" | "few_teeth" | "unknown" | "stain" | "event";

export const CONCERNS: { value: Concern; label: string; category: "orthodontics" | "whitening" }[] = [
  { value: "crowding", label: "ガタガタ", category: "orthodontics" },
  { value: "protrusion", label: "出っ歯", category: "orthodontics" },
  { value: "gap", label: "すきっ歯", category: "orthodontics" },
  { value: "underbite", label: "受け口", category: "orthodontics" },
  { value: "few_teeth", label: "1〜2本だけ", category: "orthodontics" },
  { value: "unknown", label: "わからない", category: "orthodontics" },
  { value: "stain", label: "黄ばみ・着色", category: "whitening" },
  { value: "event", label: "結婚式などの日までに白く", category: "whitening" },
];

/** 悩みごとに候補になりやすい治療（先頭ほど当てはまりやすい）と、相談時に伝える注意 */
const CANDIDATES: Record<Concern, { options: TreatmentOption[]; caution?: string }> = {
  crowding: { options: ["ortho_partial", "ortho_aligner", "ortho_wire", "ortho_lingual"], caution: "ガタガタが大きい場合や抜歯が必要な場合は、部分矯正では治せないことがあります。" },
  protrusion: { options: ["ortho_aligner", "ortho_wire", "ortho_lingual"], caution: "出っ歯は奥歯のかみ合わせも動かすことが多く、全体矯正になりやすいです。" },
  gap: { options: ["ortho_partial", "ortho_aligner", "ortho_wire"] },
  underbite: { options: ["ortho_wire", "ortho_aligner", "ortho_lingual"], caution: "受け口は骨格が原因のこともあり、マウスピースだけでは難しい場合があります。" },
  few_teeth: { options: ["ortho_partial", "ortho_aligner"] },
  unknown: { options: ["ortho_aligner", "ortho_partial", "ortho_wire"], caution: "タイプがわからなくても大丈夫です。写真があると医院が答えやすくなります。" },
  stain: { options: ["whitening_office", "whitening_home", "whitening_dual"], caution: "詰め物や被せ物は白くならないため、別の治療が必要になることがあります。" },
  event: { options: ["whitening_office", "whitening_dual"], caution: "日程が近い場合は、来院回数が少ないオフィスホワイトニングが向いています。" },
};

/** 掲載医院の料金が足りないときに使う一般的な相場（円・税込、目安） */
const GENERIC: Partial<Record<TreatmentOption, [number, number]>> = {
  ortho_partial: [200_000, 450_000],
  ortho_aligner: [500_000, 1_000_000],
  ortho_wire: [600_000, 1_000_000],
  ortho_lingual: [1_000_000, 1_500_000],
  whitening_office: [20_000, 60_000],
  whitening_home: [20_000, 50_000],
  whitening_dual: [50_000, 110_000],
};

/** 矯正で広告価格に含まれていないことが多い費用（検査・調整・保定装置など） */
export const ORTHO_EXTRA: [number, number] = [50_000, 150_000];

export interface Estimate {
  option: TreatmentOption;
  min: number;
  max: number;
  /** 掲載医院の料金から出したか、一般的な相場か */
  source: "clinics" | "generic";
  extra: [number, number] | null;
}

export function candidatesFor(concern: Concern) {
  return CANDIDATES[concern];
}

/** 悩みと医院の料金から、候補の治療ごとに費用の目安を出す */
export function estimate(concern: Concern, clinics: Clinic[]): Estimate[] {
  return CANDIDATES[concern].options.flatMap((option) => {
    const prices = clinics.flatMap((c) => c.treatments.filter((t) => t.option_code === option));
    const generic = GENERIC[option];
    if (!prices.length && !generic) return [];
    const isOrtho = option.startsWith("ortho_");
    return [
      {
        option,
        min: prices.length ? Math.min(...prices.map((p) => p.price_min)) : generic![0],
        max: prices.length ? Math.max(...prices.map((p) => p.price_max)) : generic![1],
        source: prices.length ? "clinics" : "generic",
        extra: isOrtho ? ORTHO_EXTRA : null,
      },
    ];
  });
}

export interface Doctor {
  id: string;
  clinic_id: string;
  name: string;
  role: string | null;
  credentials: string[];
  years: number | null;
  specialties: TreatmentOption[];
  days: string | null;
  photo_url: string | null;
  message: string | null;
}

export const MAX_CLINICS_PER_CONSULT = 3;
export const MAX_PHOTOS = 4;
