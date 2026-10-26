// POST /api/diagnosis：回答を受け取り、おすすめ医院を返してリードを保存する
import { NextResponse } from "next/server";
import { matchClinics } from "@/lib/matching";
import { BUDGETS, OPTIONS, PREFECTURES, PRIORITIES } from "@/lib/options";
import { fallbackClinics } from "@/lib/data";
import { getReadDb, getSupabaseAdmin } from "@/lib/supabase";
import type { Clinic, DiagnosisInput, TreatmentCategory } from "@/lib/types";
import { stationBySlug } from "@/lib/yamanote";

function parseInput(body: unknown): DiagnosisInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const category = b.category as TreatmentCategory;
  if (!(category in OPTIONS)) return null;
  if (!OPTIONS[category].some((o) => o.value === b.option)) return null;
  if (!BUDGETS[category].some((x) => x.value === b.budgetMax)) return null;
  if (!PREFECTURES.includes(b.prefecture as (typeof PREFECTURES)[number])) return null;
  if (b.station != null && (b.prefecture !== "東京都" || !stationBySlug(b.station as string))) return null;
  const priorities = Array.isArray(b.priorities) ? b.priorities : [];
  if (!priorities.every((p) => PRIORITIES.some((x) => x.value === p))) return null;
  return {
    category,
    option: b.option as DiagnosisInput["option"],
    budgetMax: b.budgetMax as number | null,
    prefecture: b.prefecture as string,
    station: (b.station as string | null | undefined) ?? null,
    priorities: priorities as DiagnosisInput["priorities"],
  };
}

async function loadClinics(input: DiagnosisInput): Promise<Clinic[]> {
  const supabase = getReadDb();
  if (!supabase) return fallbackClinics();

  // 希望の治療を扱う医院だけを取得（エリア外も候補に残し、スコアで下げる）
  const { data, error } = await supabase
    .from("clinics")
    .select("*, treatments:clinic_treatments!inner(option_code, price_min, price_max, duration_label, cases_count, source_url, updated_at, price_note)")
    .eq("is_published", true)
    .eq("clinic_treatments.option_code", input.option);

  if (error) {
    console.error("[diagnosis] failed to load clinics", error);
    return fallbackClinics();
  }
  return data as Clinic[];
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const input = parseInput(body);
  if (!input) return NextResponse.json({ error: "回答内容が正しくありません" }, { status: 400 });

  const clinics = await loadClinics(input);
  const matches = matchClinics(clinics, input, 10); // 比べるリストに入れて選べるよう多めに返す

  // リード保存（失敗しても診断結果は返す）
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const utm = (body?.utm ?? {}) as Record<string, string | undefined>;
    const { error } = await supabase.from("diagnosis_leads").insert({
      category: input.category,
      option_code: input.option,
      budget_max: input.budgetMax,
      prefecture: input.prefecture,
      station_slug: input.station ?? null,
      priorities: input.priorities,
      matched_clinic_ids: matches.map((m) => m.clinic.id),
      utm_source: utm.source ?? null,
      utm_medium: utm.medium ?? null,
      utm_campaign: utm.campaign ?? null,
    });
    if (error) console.error("[diagnosis] failed to save lead", error);
  }

  return NextResponse.json({ matches });
}
