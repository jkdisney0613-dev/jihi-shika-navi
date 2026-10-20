// 毎日：①掲載中医院の Google 評価を更新 ②その日の山手線の駅（30日で一周）の周辺で新しい医院を探して自費メニューを調査 ③古い価格情報を再調査
import { NextResponse } from "next/server";
import { researchClinic } from "@/lib/clinic-research";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getPlace, searchClinics } from "@/lib/google-places";
import { getSupabaseAdmin } from "@/lib/supabase";
import { stationOfTheDay } from "@/lib/yamanote";

export const maxDuration = 800; // Vercel Pro の上限。Hobby では 300 にして件数を減らす

const NEW_PER_DAY = 5; // 1日に新規調査する医院数（1駅あたり）
const REFRESH_PER_DAY = 3; // 1日に再調査する既存医院数
const STALE_DAYS = 30; // これより古い価格情報は再調査

// 駅ごとに4つの治療で検索する（例：「渋谷駅 ホワイトニング」）
const TREATMENT_QUERIES = ["ホワイトニング 歯科", "矯正歯科", "インプラント", "歯科 クリーニング 自費"];

const categoryOf = (code: string) =>
  ({ whitening: "whitening", ortho: "orthodontics", implant: "implant", cleaning: "cleaning" })[code.split("_")[0]]!;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });

  const summary = { ratingsUpdated: 0, discovered: 0, refreshed: 0, errors: [] as string[] };

  // ① 評価・口コミ件数の更新
  const { data: withPlace } = await db.from("clinics").select("id, google_place_id").not("google_place_id", "is", null);
  for (const c of withPlace ?? []) {
    try {
      const p = await getPlace(c.google_place_id);
      await db.from("clinics").update({ rating: p.rating ?? 0, review_count: p.reviewCount, rating_updated_at: new Date().toISOString() }).eq("id", c.id);
      summary.ratingsUpdated++;
    } catch (e) {
      summary.errors.push(`rating ${c.id}: ${(e as Error).message}`);
    }
  }

  async function saveResearch(clinicId: string, name: string, website: string, address: string) {
    const r = await researchClinic(name, website, address);
    if (!r.is_dental_clinic) return false;
    await db!.from("clinics").update({
      prefecture: r.prefecture, city: r.city, nearest_station: r.nearest_station, walk_minutes: r.walk_minutes,
      features: r.features, catch_copy: r.catch_copy, researched_at: new Date().toISOString(),
    }).eq("id", clinicId);
    if (r.treatments.length > 0) {
      await db!.from("clinic_treatments").upsert(
        r.treatments.map((t) => ({ ...t, clinic_id: clinicId, category: categoryOf(t.option_code), updated_at: new Date().toISOString() })),
        { onConflict: "clinic_id,option_code" },
      );
    }
    return true;
  }

  // ② その日の駅の周辺で新しい医院を発見して調査（自動収集分は is_published=false で入れ、確認後に公開）
  const station = stationOfTheDay();
  const query = `${station.name}駅`;
  try {
    const found = new Map<string, Awaited<ReturnType<typeof searchClinics>>[number]>();
    for (const t of TREATMENT_QUERIES) {
      for (const p of await searchClinics(`${station.name}駅 ${t}`, 10)) found.set(p.id, p);
    }
    const places = [...found.values()];
    const { data: known } = await db.from("clinics").select("google_place_id").in("google_place_id", places.map((p) => p.id));
    const knownIds = new Set((known ?? []).map((k) => k.google_place_id));
    // 口コミが多い医院から調べる（実在・稼働している可能性が高い）
    const fresh = places
      .filter((p) => !knownIds.has(p.id) && p.websiteUrl)
      .sort((x, y) => y.reviewCount - x.reviewCount)
      .slice(0, NEW_PER_DAY);

    for (const p of fresh) {
      try {
        const { data: inserted, error } = await db.from("clinics").insert({
          slug: `c-${p.id.slice(-12).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          name: p.name, prefecture: "東京都", city: "", nearest_station: `${station.name}駅`, station_slug: station.slug,
          rating: p.rating ?? 0, review_count: p.reviewCount, rating_updated_at: new Date().toISOString(),
          google_place_id: p.id, website_url: p.websiteUrl, source: "auto_research", is_published: false,
        }).select("id").single();
        if (error) throw error;
        const ok = await saveResearch(inserted.id, p.name, p.websiteUrl!, p.address);
        if (!ok) await db.from("clinics").delete().eq("id", inserted.id);
        else summary.discovered++;
      } catch (e) {
        summary.errors.push(`discover ${p.name}: ${(e as Error).message}`);
      }
    }

    const { data: prev } = await db.from("station_research").select("clinics_found, runs").eq("station_slug", station.slug).maybeSingle();
    await db.from("station_research").upsert({
      station_slug: station.slug,
      last_run_at: new Date().toISOString(),
      clinics_found: (prev?.clinics_found ?? 0) + summary.discovered,
      runs: (prev?.runs ?? 0) + 1,
    });
  } catch (e) {
    summary.errors.push(`search "${query}": ${(e as Error).message}`);
  }

  // ③ 価格情報が古い医院を再調査
  const staleBefore = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  const { data: stale } = await db.from("clinics")
    .select("id, name, website_url, city")
    .not("website_url", "is", null)
    .or(`researched_at.is.null,researched_at.lt.${staleBefore}`)
    .order("researched_at", { ascending: true, nullsFirst: true })
    .limit(REFRESH_PER_DAY);
  for (const c of stale ?? []) {
    try {
      if (await saveResearch(c.id, c.name, c.website_url, c.city)) summary.refreshed++;
    } catch (e) {
      summary.errors.push(`refresh ${c.name}: ${(e as Error).message}`);
    }
  }

  await db.from("routine_runs").insert({
    routine: "clinics", status: summary.errors.length ? "partial" : "success", summary: { query, ...summary }, finished_at: new Date().toISOString(),
  });
  return NextResponse.json(summary);
}
