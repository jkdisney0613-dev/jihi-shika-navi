// 診断結果から医院をスコアリングして並べる（サーバー・クライアントどちらでも動く純粋関数）
import { PRIORITIES, formatPrice } from "./options";
import { stationBySlug, stationDistance } from "./yamanote";
import type { Clinic, ClinicMatch, DiagnosisInput } from "./types";

// 配点（合計100点）
const WEIGHT = {
  budget: 40, // 予算との適合
  area: 25, // 希望エリア
  priorities: 20, // 重視ポイントの一致
  reputation: 15, // 口コミ評価・症例数
} as const;

function budgetScore(priceMin: number, priceMax: number, budgetMax: number | null): number {
  if (budgetMax === null) return WEIGHT.budget * 0.8;
  if (priceMax <= budgetMax) return WEIGHT.budget; // 上限まで含めて予算内
  if (priceMin <= budgetMax) {
    // 最低価格は予算内。予算でカバーできる価格帯の割合で加点
    const coverage = (budgetMax - priceMin) / Math.max(priceMax - priceMin, 1);
    return WEIGHT.budget * (0.5 + 0.4 * coverage);
  }
  // 予算オーバー：20%超過で0点になるよう減点
  const over = (priceMin - budgetMax) / budgetMax;
  return Math.max(0, WEIGHT.budget * 0.4 * (1 - over / 0.2));
}

export function matchClinics(clinics: Clinic[], input: DiagnosisInput, limit = 3): ClinicMatch[] {
  const matches: ClinicMatch[] = [];

  for (const clinic of clinics) {
    const treatment = clinic.treatments.find((t) => t.option_code === input.option);
    if (!treatment) continue; // 希望の治療を扱っていない医院は除外

    const reasons: string[] = [];
    const withinBudget = input.budgetMax === null || treatment.price_min <= input.budgetMax;

    // 予算
    const b = budgetScore(treatment.price_min, treatment.price_max, input.budgetMax);
    if (input.budgetMax !== null && treatment.price_max <= input.budgetMax) {
      reasons.push(`費用の目安（${formatPrice(treatment.price_min)}〜${formatPrice(treatment.price_max)}）がご予算内`);
    } else if (withinBudget && input.budgetMax !== null) {
      reasons.push(`${formatPrice(treatment.price_min)}〜のプランならご予算内`);
    }

    // エリア
    // 山手線の駅を選んでいれば、同じ駅で満点・隣の駅で7割…と近さで加点する
    const sameArea = clinic.prefecture === input.prefecture;
    let a = sameArea ? WEIGHT.area : 0;
    if (sameArea && input.station) {
      const d = stationDistance(input.station, clinic.station_slug);
      a = d === null ? WEIGHT.area * 0.2 : WEIGHT.area * Math.max(0, 1 - d * 0.3);
      if (d === 0) reasons.push(`${stationBySlug(input.station)!.name}駅エリア・徒歩${clinic.walk_minutes}分`);
      else if (d !== null && d <= 2) reasons.push(`${stationBySlug(input.station)!.name}駅から山手線で${d}駅の${clinic.nearest_station}`);
    } else if (sameArea) {
      reasons.push(`${clinic.nearest_station}から徒歩${clinic.walk_minutes}分`);
    }

    // 重視ポイント
    const hit = input.priorities.filter((p) => clinic.features.includes(p));
    const p = input.priorities.length === 0 ? WEIGHT.priorities * 0.5 : (WEIGHT.priorities * hit.length) / input.priorities.length;
    for (const h of hit) {
      const label = PRIORITIES.find((x) => x.value === h)?.label;
      if (label) reasons.push(`「${label}」に対応`);
    }

    // 評判（評価 3.5〜5.0 を 0〜1 に、症例数 300件で満点）
    const ratingPart = Math.min(Math.max((clinic.rating - 3.5) / 1.5, 0), 1);
    const casesPart = Math.min(treatment.cases_count / 300, 1);
    const r = WEIGHT.reputation * (0.6 * ratingPart + 0.4 * casesPart);
    if (treatment.cases_count >= 200) reasons.push(`この治療の年間症例 ${treatment.cases_count}件`);

    matches.push({
      clinic,
      treatment,
      score: Math.round(b + a + p + r),
      withinBudget,
      reasons: reasons.slice(0, 4),
    });
  }

  // 希望エリアに候補があればエリア内だけを提案し、ない場合のみ他エリアも出す
  const inArea = matches.filter((m) => m.clinic.prefecture === input.prefecture);
  return (inArea.length > 0 ? inArea : matches)
    .sort((x, y) => Number(y.withinBudget) - Number(x.withinBudget) || y.score - x.score)
    .slice(0, limit);
}
