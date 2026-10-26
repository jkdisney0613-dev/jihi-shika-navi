// フォームに表示する選択肢のマスタ（文言はここだけ直せば画面に反映される）
import { DEMO_MODE } from "./demo";
import type { Priority, TreatmentCategory, TreatmentOption } from "./types";

const ALL_CATEGORIES: { value: TreatmentCategory; label: string; description: string; icon: string }[] = [
  { value: "whitening", label: "ホワイトニング", description: "歯を白く明るくしたい", icon: "✨" },
  { value: "orthodontics", label: "矯正", description: "歯並び・かみ合わせを整えたい", icon: "😁" },
  { value: "implant", label: "インプラント", description: "失った歯を補いたい", icon: "🦷" },
  { value: "cleaning", label: "自費クリーニング", description: "着色や歯石をしっかり落としたい", icon: "🪥" },
];

/** 実在の医院を掲載している治療（本番は渋谷から順にホワイトニングと矯正だけ載せる） */
export const LIVE_CATEGORIES: TreatmentCategory[] = ["whitening", "orthodontics"];

/** 画面に出す治療。テスト公開中は4つすべて、本番は医院データがある治療だけ */
export const CATEGORIES = DEMO_MODE ? ALL_CATEGORIES : ALL_CATEGORIES.filter((c) => LIVE_CATEGORIES.includes(c.value));

export const OPTIONS: Record<TreatmentCategory, { value: TreatmentOption; label: string; description: string }[]> = {
  whitening: [
    { value: "whitening_office", label: "オフィスホワイトニング", description: "医院で施術。1回で効果を実感しやすい" },
    { value: "whitening_home", label: "ホームホワイトニング", description: "自宅でマウスピース。白さが長持ち" },
    { value: "whitening_dual", label: "デュアルホワイトニング", description: "両方の併用。早く・白く・長持ち" },
  ],
  orthodontics: [
    { value: "ortho_aligner", label: "目立たないマウスピース矯正", description: "透明で取り外せる。インビザライン等" },
    { value: "ortho_lingual", label: "裏側矯正", description: "歯の裏に装置。外から見えない" },
    { value: "ortho_wire", label: "表側ワイヤー矯正", description: "幅広い症例に対応。費用を抑えやすい" },
    { value: "ortho_partial", label: "部分矯正（前歯のみ）", description: "気になる部分だけ短期間で" },
  ],
  implant: [
    { value: "implant_single", label: "1本だけ", description: "1本分のインプラント（被せ物込み）" },
    { value: "implant_multiple", label: "2〜3本", description: "複数本をまとめて治療" },
    { value: "implant_all_on_4", label: "オールオン4（総入れ歯の代わり）", description: "4〜6本で全体を支える" },
  ],
  cleaning: [
    { value: "cleaning_pmtc", label: "PMTC（プロのクリーニング）", description: "専用器具で歯面をツルツルに" },
    { value: "cleaning_airflow", label: "エアフロー", description: "パウダー噴射で着色を落とす" },
    { value: "cleaning_subscription", label: "定期ケアプラン", description: "月額・回数券で通い続ける" },
  ],
};

/** 予算の選択肢。value は上限金額（円）、null は「こだわらない」 */
export const BUDGETS: Record<TreatmentCategory, { value: number | null; label: string }[]> = {
  whitening: [
    { value: 30_000, label: "〜3万円" },
    { value: 50_000, label: "〜5万円" },
    { value: 100_000, label: "〜10万円" },
    { value: null, label: "こだわらない" },
  ],
  orthodontics: [
    { value: 300_000, label: "〜30万円" },
    { value: 500_000, label: "〜50万円" },
    { value: 800_000, label: "〜80万円" },
    { value: 1_200_000, label: "〜120万円" },
    { value: null, label: "こだわらない" },
  ],
  implant: [
    { value: 400_000, label: "〜40万円" },
    { value: 1_000_000, label: "〜100万円" },
    { value: 2_000_000, label: "〜200万円" },
    { value: 3_500_000, label: "〜350万円" },
    { value: null, label: "こだわらない" },
  ],
  cleaning: [
    { value: 10_000, label: "〜1万円" },
    { value: 20_000, label: "〜2万円" },
    { value: 50_000, label: "〜5万円" },
    { value: null, label: "こだわらない" },
  ],
};

export const PREFECTURES = ["東京都", "神奈川県", "埼玉県", "千葉県", "大阪府", "愛知県", "福岡県"] as const;

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "price", label: "費用を抑えたい" },
  { value: "track_record", label: "症例実績が多い" },
  { value: "access", label: "駅近で通いやすい" },
  { value: "weekend", label: "土日・夜間も診療" },
  { value: "painless", label: "痛みに配慮" },
  { value: "female_doctor", label: "女性医師がいる" },
];

export const yen = (n: number) => `${(n / 10_000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
export const yenRaw = (n: number) => `${n.toLocaleString("ja-JP")}円`;
export const formatPrice = (n: number) => (n >= 10_000 ? yen(n) : yenRaw(n));
/** 「33万円〜99万円」。単一価格なら「2.5万円」 */
export const formatPriceRange = (min: number, max: number) => (min === max ? formatPrice(min) : `${formatPrice(min)}〜${formatPrice(max)}`);
