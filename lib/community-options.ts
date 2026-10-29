// みんなの記録・質問ひろばの選択肢と型（画面のフォームからも読むので、サーバー専用のものは入れない）
import { LIVE_CATEGORIES, OPTIONS } from "./options";
import type { TreatmentOption } from "./types";

/** 記録・質問の対象にする治療（医院を載せている治療と同じ） */
export const COMMUNITY_OPTIONS = LIVE_CATEGORIES.flatMap((c) => OPTIONS[c]);
export const optionLabel = (code: string | null | undefined) => COMMUNITY_OPTIONS.find((o) => o.value === code)?.label ?? null;
/** カードに出す短い名前 */
export const OPTION_SHORT: Partial<Record<TreatmentOption, string>> = {
  whitening_office: "オフィスホワイトニング", whitening_home: "ホームホワイトニング", whitening_dual: "デュアルホワイトニング",
  ortho_aligner: "マウスピース矯正", ortho_lingual: "裏側矯正", ortho_wire: "ワイヤー矯正（表側）", ortho_partial: "部分矯正",
};
export const shortLabel = (code: string | null | undefined) => (code && OPTION_SHORT[code as TreatmentOption]) || optionLabel(code) || "";

export const AGE_BANDS = ["10代", "20代前半", "20代後半", "30代", "40代", "50代以上"] as const;
export const DURATIONS: { value: number; label: string }[] = [
  { value: 0, label: "1回だけ" }, { value: 1, label: "1か月くらい" }, { value: 3, label: "3か月くらい" }, { value: 6, label: "半年くらい" },
  { value: 12, label: "1年くらい" }, { value: 18, label: "1年半くらい" }, { value: 24, label: "2年くらい" }, { value: 36, label: "3年以上" },
];
export const durationLabel = (m: number | null) => (m === null ? "" : DURATIONS.find((d) => d.value === m)?.label ?? `${m}か月`);
export const CHOOSE_AGAIN = { yes: "また選ぶ", maybe: "迷う", no: "選ばない" } as const;
export const TOPICS = { care: "お手入れ", cost: "費用", choice: "選び方", other: "その他" } as const;
export type Topic = keyof typeof TOPICS;
export const ANSWERER_STAGES = ["やった人", "治療中", "検討中"] as const;
export const EXPERT_ROLES = { dental_hygienist: "歯科衛生士", dentist: "歯科医師" } as const;
/** みんなの総額を出すのに必要な記録数（少ないと個人の特定につながるため） */
export const MIN_RECORDS_FOR_STATS = 3;

export interface Experience {
  id: string;
  option_code: string;
  total_paid: number;
  months: number | null;
  pain: number | null;
  satisfaction: number;
  choose_again: keyof typeof CHOOSE_AGAIN | null;
  age_band: string | null;
  good: string | null;
  regret: string | null;
  created_at: string;
  helpful: number;
  /** 見本（本物の投稿がまだないときだけ出す。集計や「参考になった」には使わない） */
  sample?: true;
}
export interface Answer {
  id: string;
  is_expert: boolean;
  expert_role: keyof typeof EXPERT_ROLES | null;
  author_label: string;
  body: string;
  created_at: string;
  helpful: number;
}
export interface Question {
  id: string;
  topic: Topic;
  option_code: string | null;
  title: string;
  body: string;
  created_at: string;
  same: number;
  answers: Answer[];
  sample?: true;
}

