// 医院サイトから自費メニューと価格を読み取る（Claude がページを取得して構造化する）
import { askJson } from "./claude";
import { PRIORITIES } from "./options";
import type { Priority, TreatmentOption } from "./types";

const OPTION_CODES: TreatmentOption[] = [
  "whitening_office", "whitening_home", "whitening_dual",
  "ortho_aligner", "ortho_lingual", "ortho_wire", "ortho_partial",
  "implant_single", "implant_multiple", "implant_all_on_4",
  "cleaning_pmtc", "cleaning_airflow", "cleaning_subscription",
];

export interface ResearchResult {
  is_dental_clinic: boolean;
  /** 公式サイトに書かれている正式な医院名 */
  official_name: string;
  /** 公式サイトに書かれている所在地（都道府県から） */
  address: string;
  prefecture: string;
  city: string;
  nearest_station: string;
  walk_minutes: number;
  /** 調査対象の山手線駅から徒歩何分か。わからなければ -1 */
  walk_minutes_from_target: number;
  features: Priority[];
  catch_copy: string;
  treatments: {
    option_code: TreatmentOption;
    price_min: number;
    price_max: number;
    duration_label: string;
    source_url: string;
    /** 税表記がない・検査料が別など。なければ空文字 */
    price_note: string;
  }[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_dental_clinic", "official_name", "address", "prefecture", "city", "nearest_station", "walk_minutes", "walk_minutes_from_target", "features", "catch_copy", "treatments"],
  properties: {
    is_dental_clinic: { type: "boolean" },
    official_name: { type: "string" },
    address: { type: "string" },
    prefecture: { type: "string" },
    city: { type: "string" },
    nearest_station: { type: "string" },
    walk_minutes: { type: "integer" },
    walk_minutes_from_target: { type: "integer" },
    features: { type: "array", items: { type: "string", enum: PRIORITIES.map((p) => p.value) } },
    catch_copy: { type: "string" },
    treatments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["option_code", "price_min", "price_max", "duration_label", "source_url", "price_note"],
        properties: {
          option_code: { type: "string", enum: OPTION_CODES },
          price_min: { type: "integer" },
          price_max: { type: "integer" },
          duration_label: { type: "string" },
          source_url: { type: "string" },
          price_note: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM = `あなたは歯科医院の自費診療メニューを調べるリサーチャーです。
医院の公式サイトを web_fetch で読み、料金表・診療案内のページもたどって、次の自費メニューの税込価格を調べてください。
- whitening_office / whitening_home / whitening_dual：ホワイトニング（オフィス／ホーム／デュアル）
- ortho_aligner（マウスピース矯正）/ ortho_lingual（裏側矯正）/ ortho_wire（表側ワイヤー）/ ortho_partial（部分矯正）：検査・調整料込みの総額目安
- implant_single（1本）/ implant_multiple（2〜3本）/ implant_all_on_4：被せ物込み
- cleaning_pmtc / cleaning_airflow / cleaning_subscription（月額）：1回あたり

ルール：
- サイトに書かれている金額だけを使い、推測で埋めない。書かれていないメニューは treatments に含めない。
- 税抜表記なら1.1倍して税込にする。税込・税抜の記載がなければ記載額のまま入れ、price_note に「公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています」と書く。
- 精密検査料・調整料などが別にかかると書かれていれば、price_note に「精密検査33,000円は別」のように短く書く。なければ空文字。
- 単一価格なら price_min と price_max を同じ値にする。duration_label はサイトに書かれた期間・回数。なければ「記載なし」。
- source_url には金額が書かれていたページのURLを入れる。
- features は、サイトで確認できたものだけ（price は相場より明らかに安い場合のみ）。
- catch_copy は医院の特徴を40字以内で事実ベースに要約する。「No.1」「最大級」「絶対」「痛くない」など比較優良・誇大・保証表現や、患者の口コミ・体験談の引用は使わない。
- official_name には公式サイトに書かれている正式な医院名、address には公式サイトに書かれている所在地を入れる。
- walk_minutes_from_target には、依頼文の「対象駅」から医院まで徒歩何分か（公式サイトのアクセス欄で確認できた値）を入れる。対象駅の記載がなければ -1。
- 学会の「認定医」など広告できない資格名、口コミ・評価・症例数は catch_copy に書かない。
- 歯科医院でなければ is_dental_clinic を false にし、他は空でよい。`;

export async function researchClinic(name: string, websiteUrl: string, address: string, targetStation?: string): Promise<ResearchResult> {
  const r = await askJson<ResearchResult>({
    system: SYSTEM,
    prompt: `医院名：${name}\n住所：${address}\n公式サイト：${websiteUrl}${targetStation ? `\n対象駅：${targetStation}` : ""}`,
    schema: SCHEMA,
    web: true,
  });
  // 明らかにおかしい価格は捨てる（桁間違い対策）
  r.treatments = r.treatments.filter((t) => t.price_min > 1_000 && t.price_max >= t.price_min && t.price_max < 10_000_000);
  return r;
}
