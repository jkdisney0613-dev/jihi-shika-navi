// 毎日：①山手線の駅を STATION_PRIORITY の順に、ホワイトニング・矯正の医院を1日 DAILY_TARGET 件ずつ増やす
//        （1駅 PER_STATION_TARGET 件たまるか、新しい医院が見つからなくなったら次の駅へ）②古い価格情報を再調査
// Hobby の関数は300秒までなので、vercel.json で1日2回（slot=1, slot=2）呼び、2回目は1回目の残りを埋める。
// Google Places は「医院の公式サイトを見つける」ためだけに使い、保存するのは place_id だけ（規約で保存が認められている）。
// 医院名・所在地・料金は医院の公式サイトから取り、Google の評価や口コミ件数は保存も表示もしない。
import { NextResponse } from "next/server";
import { researchClinic, type ResearchResult } from "@/lib/clinic-research";
import { checkCompliance } from "@/lib/compliance";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { searchClinics, type PlaceSummary } from "@/lib/google-places";
import { LIVE_CATEGORIES } from "@/lib/options";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PER_STATION_TARGET, STATION_PRIORITY, stationBySlug } from "@/lib/yamanote";

export const maxDuration = 300; // Hobby の上限。Pro にしたら 800 まで延ばせる

const DAILY_TARGET = 10; // 1日に増やす医院数（2回の実行の合計）
const CONCURRENCY = 5; // 同時に調べる医院数
const STOP_STARTING_AT_MS = 170_000; // これを過ぎたら新しい調査を始めない（1件の調査に最大2分ほどかかる）
const MAX_WALK_MINUTES = 10; // 対象駅から徒歩何分までをその駅の医院とみなすか
const REFRESH_PER_RUN = 3; // 1回に再調査する既存医院数
const STALE_DAYS = 30; // これより古い価格情報は再調査
// 審査を通った医院は自動で公開する。false にすると全件「非公開」で入り、管理画面で確認してから公開する
const AUTO_PUBLISH = process.env.CLINIC_AUTO_PUBLISH !== "false";

// 駅ごとに2つの治療で検索する（例：「渋谷駅 ホワイトニング 歯科」）
const TREATMENT_QUERIES = ["ホワイトニング 歯科", "矯正歯科"];
const LIVE_PREFIXES = LIVE_CATEGORIES.map((c) => ({ whitening: "whitening_", orthodontics: "ortho_", implant: "implant_", cleaning: "cleaning_" })[c]);

const categoryOf = (code: string) =>
  ({ whitening: "whitening", ortho: "orthodontics", implant: "implant", cleaning: "cleaning" })[code.split("_")[0]]!;
const normName = (s: string) => s.replace(/[\s・\-ー（）()]/g, "").replace(/医療法人(社団)?\S*?(会|団)/, "").toLowerCase();
const hostOf = (url: string | null | undefined) => {
  try { return url ? new URL(url).hostname.replace(/^www\./, "") : null; } catch { return null; }
};

/** 同時実行数を絞って順に処理する（締め切りを過ぎたら新しい仕事は始めない） */
async function pool<T>(items: T[], n: number, canStart: () => boolean, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length && canStart()) await fn(items[i++]);
  }));
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });

  const startedAt = Date.now();
  const canStart = () => Date.now() - startedAt < STOP_STARTING_AT_MS;
  const slot = new URL(req.url).searchParams.get("slot") ?? "1";
  const summary = { slot, stations: [] as string[], published: 0, needsReview: 0, skipped: 0, refreshed: 0, errors: [] as string[] };

  const onlyLive = (r: ResearchResult) => r.treatments.filter((t) => LIVE_PREFIXES.some((p) => t.option_code.startsWith(p)));

  async function saveTreatments(clinicId: string, treatments: ResearchResult["treatments"]) {
    if (treatments.length === 0) return;
    const { error } = await db!.from("clinic_treatments").upsert(
      treatments.map((t) => ({
        clinic_id: clinicId, category: categoryOf(t.option_code), option_code: t.option_code,
        price_min: t.price_min, price_max: t.price_max, duration_label: t.duration_label,
        source_url: t.source_url, price_note: t.price_note || null, updated_at: new Date().toISOString(),
      })),
      { onConflict: "clinic_id,option_code" },
    );
    if (error) throw error;
  }

  // ① 今日まだ増やしていない分だけ、優先順の駅で新しい医院を探す
  const todayJst = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const { count: addedToday } = await db.from("clinics").select("id", { count: "exact", head: true })
    .eq("source", "auto_research").gte("created_at", `${todayJst}T00:00:00+09:00`);
  let remaining = Math.max(0, DAILY_TARGET - (addedToday ?? 0));

  const [{ data: existing }, { data: research }] = await Promise.all([
    db.from("clinics").select("name, website_url, google_place_id, station_slug, is_published"),
    db.from("station_research").select("station_slug, exhausted_at"),
  ]);
  const knownPlaces = new Set((existing ?? []).map((c) => c.google_place_id).filter(Boolean));
  const knownNames = new Set((existing ?? []).map((c) => normName(c.name)));
  const knownHosts = new Set((existing ?? []).map((c) => hostOf(c.website_url)).filter(Boolean));
  const exhausted = new Set((research ?? []).filter((r) => r.exhausted_at).map((r) => r.station_slug));
  const published = new Map<string, number>();
  for (const c of existing ?? []) if (c.is_published && c.station_slug) published.set(c.station_slug, (published.get(c.station_slug) ?? 0) + 1);

  for (const slug of STATION_PRIORITY) {
    if (remaining <= 0 || !canStart()) break;
    if ((published.get(slug) ?? 0) >= PER_STATION_TARGET || exhausted.has(slug)) continue;
    const station = stationBySlug(slug)!;
    summary.stations.push(slug);
    let found = 0;

    try {
      const places = new Map<string, PlaceSummary>();
      for (const q of TREATMENT_QUERIES) {
        for (const p of await searchClinics(`${station.name}駅 ${q}`, 20)) places.set(p.id, p);
      }
      // 公式サイトがあり、まだ載せていない医院だけを検索結果の順に調べる（名前・ドメインでも重複を除く）
      const fresh = [...places.values()].filter((p) =>
        p.websiteUrl && !knownPlaces.has(p.id) && !knownNames.has(normName(p.name)) && !knownHosts.has(hostOf(p.websiteUrl)));

      let processed = 0;
      let inFlight = 0; // 調査中の件数（残り枠を超えて調べ始めないため）
      const room = () => Math.min(remaining, PER_STATION_TARGET - (published.get(slug) ?? 0)) - inFlight;
      await pool(fresh, CONCURRENCY, () => canStart() && room() > 0, async (p) => {
        processed++;
        inFlight++;
        knownPlaces.add(p.id); // 同じ実行内で2回調べない
        try {
          const r = await researchClinic(p.name, p.websiteUrl!, p.address, `${station.name}駅`);
          const treatments = onlyLive(r).filter((t) => t.source_url);
          const walk = r.walk_minutes_from_target;
          if (!r.is_dental_clinic || treatments.length === 0 || walk < 0 || walk > MAX_WALK_MINUTES) {
            summary.skipped++;
            return;
          }
          const issues = checkCompliance(r.catch_copy);
          const publish = AUTO_PUBLISH && issues.length === 0;
          const { data: inserted, error } = await db.from("clinics").insert({
            slug: `c-${p.id.slice(-12).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            name: r.official_name || p.name, address: r.address || null, prefecture: r.prefecture || "東京都", city: r.city,
            nearest_station: `${station.name}駅`, walk_minutes: walk, station_slug: slug,
            features: r.features, catch_copy: issues.length ? "" : r.catch_copy, researched_at: new Date().toISOString(),
            google_place_id: p.id, website_url: p.websiteUrl, source: "auto_research", is_published: publish,
          }).select("id").single();
          if (error) throw error;
          await saveTreatments(inserted.id, treatments);
          knownNames.add(normName(r.official_name || p.name));
          knownHosts.add(hostOf(p.websiteUrl));
          remaining--;
          found++;
          if (publish) {
            summary.published++;
            published.set(slug, (published.get(slug) ?? 0) + 1);
          } else {
            summary.needsReview++;
          }
        } catch (e) {
          summary.errors.push(`${station.name} ${p.name}: ${(e as Error).message}`);
        } finally {
          inFlight--;
        }
      });

      // 候補を全部調べ終えても目標に届かない駅は、これ以上見つからないとみなして次の駅へ進む
      const done = processed >= fresh.length && (published.get(slug) ?? 0) < PER_STATION_TARGET;
      const { data: prev } = await db.from("station_research").select("clinics_found, runs").eq("station_slug", slug).maybeSingle();
      await db.from("station_research").upsert({
        station_slug: slug,
        last_run_at: new Date().toISOString(),
        clinics_found: (prev?.clinics_found ?? 0) + found,
        runs: (prev?.runs ?? 0) + 1,
        ...(done ? { exhausted_at: new Date().toISOString() } : {}),
      });
    } catch (e) {
      summary.errors.push(`search ${station.name}: ${(e as Error).message}`);
    }
  }

  // ② 時間が残っていれば、価格情報が古い医院を再調査
  if (canStart()) {
    const staleBefore = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
    const { data: stale } = await db.from("clinics")
      .select("id, name, website_url, address, city")
      .not("website_url", "is", null)
      .or(`researched_at.is.null,researched_at.lt.${staleBefore}`)
      .order("researched_at", { ascending: true, nullsFirst: true })
      .limit(REFRESH_PER_RUN);
    await pool(stale ?? [], CONCURRENCY, canStart, async (c) => {
      try {
        const r = await researchClinic(c.name, c.website_url, c.address ?? c.city);
        if (!r.is_dental_clinic) return;
        await db.from("clinics").update({ researched_at: new Date().toISOString() }).eq("id", c.id);
        await saveTreatments(c.id, onlyLive(r).filter((t) => t.source_url));
        summary.refreshed++;
      } catch (e) {
        summary.errors.push(`refresh ${c.name}: ${(e as Error).message}`);
      }
    });
  }

  await db.from("routine_runs").insert({
    routine: "clinics", status: summary.errors.length ? "partial" : "success", summary, finished_at: new Date().toISOString(),
  });
  return NextResponse.json(summary);
}
