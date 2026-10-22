// 診断フォームと医院マッチングで共有する型定義

export type TreatmentCategory = "whitening" | "orthodontics" | "implant" | "cleaning";

/** 治療カテゴリごとの「希望」の選択肢（DB の clinic_treatments.option_code と一致させる） */
export type TreatmentOption =
  // ホワイトニング
  | "whitening_office"
  | "whitening_home"
  | "whitening_dual"
  // 矯正
  | "ortho_aligner" // 目立たないマウスピース矯正
  | "ortho_lingual" // 裏側（舌側）矯正
  | "ortho_wire" // 表側ワイヤー矯正
  | "ortho_partial" // 部分矯正
  // インプラント
  | "implant_single"
  | "implant_multiple"
  | "implant_all_on_4"
  // 自費クリーニング
  | "cleaning_pmtc"
  | "cleaning_airflow"
  | "cleaning_subscription";

/** 医院を選ぶときに重視するポイント（clinics.features と照合） */
export type Priority =
  | "price" // 費用を抑えたい
  | "track_record" // 症例実績が多い
  | "access" // 駅近・通いやすい
  | "weekend" // 土日・夜間診療
  | "painless" // 痛みに配慮
  | "female_doctor"; // 女性医師

export interface DiagnosisInput {
  category: TreatmentCategory;
  option: TreatmentOption;
  /** 予算上限（円）。null は「こだわらない」 */
  budgetMax: number | null;
  prefecture: string;
  /** 山手線の駅（東京都のときだけ任意で選ぶ） */
  station?: string | null;
  priorities: Priority[];
}

export interface ClinicTreatment {
  option_code: TreatmentOption;
  price_min: number; // 円・税込
  price_max: number;
  duration_label: string; // 例: "6ヶ月〜1年"
  cases_count: number; // 年間症例数
  /** 金額が書かれていた医院公式ページ */
  source_url?: string | null;
  /** 金額を最後に確認した日時 */
  updated_at?: string | null;
}

export interface Clinic {
  id: string;
  slug: string;
  name: string;
  prefecture: string;
  city: string;
  nearest_station: string;
  walk_minutes: number;
  /** 最寄りの山手線駅（lib/yamanote.ts の slug）。山手線エリア外は null */
  station_slug: string | null;
  features: Priority[];
  catch_copy: string;
  image_url: string | null;
  booking_url: string | null;
  treatments: ClinicTreatment[];
}

export interface ClinicMatch {
  clinic: Clinic;
  treatment: ClinicTreatment;
  score: number; // 0〜100
  withinBudget: boolean;
  reasons: string[];
}
