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
  prefecture: string;
  city: string;
  nearest_station: string;
  walk_minutes: number;
  features: Priority[];
  catch_copy: string;
  treatments: {
    option_code: TreatmentOption;
    price_min: number;
    price_max: number;
    duration_label: string;
    source_url: string;
  }[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_dental_clinic", "prefecture", "city", "nearest_station", "walk_minutes", "features", "catch_copy", "treatments"],
  properties: {
    is_dental_clinic: { type: "boolean" },
    prefecture: { type: "string" },
    city: { type: "string" },
    nearest_station: { type: "string" },
    walk_minutes: { type: "integer" },
    features: { type: "array", items: { type: "string", enum: PRIORITIES.map((p) => p.value) } },
    catch_copy: { type: "string" },
    treatments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["option_code", "price_min", "price_max", "duration_label", "source_url"],
        properties: {
          option_code: { type: "string", enum: OPTION_CODES },
          price_min: { type: "integer" },
          price_max: { type: "integer" },
          duration_label: { type: "string" },
          source_url: { type: "string" },
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
- 税抜表記なら1.1倍して税込にする。単一価格なら price_min と price_max を同じ値にする。
- source_url には金額が書かれていたページのURLを入れる。
- features は、サイトで確認できたものだけ（price は相場より明らかに安い場合のみ）。
- catch_copy は医院の特徴を40字以内で事実ベースに要約する。「No.1」「絶対」「痛くない」など誇大・保証表現は使わない。
- 歯科医院でなければ is_dental_clinic を false にし、他は空でよい。`;

export async function researchClinic(name: string, websiteUrl: string, address: string): Promise<ResearchResult> {
  const r = await askJson<ResearchResult>({
    system: SYSTEM,
    prompt: `医院名：${name}\n住所：${address}\n公式サイト：${websiteUrl}`,
    schema: SCHEMA,
    web: true,
  });
  // 明らかにおかしい価格は捨てる（桁間違い対策）
  r.treatments = r.treatments.filter((t) => t.price_min > 1_000 && t.price_max >= t.price_min && t.price_max < 10_000_000);
  return r;
}
