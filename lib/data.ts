// ページ表示用のデータ取得（Supabase 未設定時はサンプルデータで動く）
import { SAMPLE_CLINICS } from "./sample-clinics";
import { getReadDb } from "./supabase";
import type { Clinic, TreatmentCategory } from "./types";

export const PREF_SLUGS: Record<string, string> = {
  tokyo: "東京都", kanagawa: "神奈川県", saitama: "埼玉県", chiba: "千葉県", osaka: "大阪府", aichi: "愛知県", fukuoka: "福岡県",
};
export const CATEGORY_SLUGS: Record<string, TreatmentCategory> = {
  whitening: "whitening", orthodontics: "orthodontics", implant: "implant", cleaning: "cleaning",
};

export async function getPublishedClinics(): Promise<Clinic[]> {
  const db = getReadDb();
  if (!db) return SAMPLE_CLINICS;
  const { data, error } = await db
    .from("clinics")
    .select("*, treatments:clinic_treatments(option_code, price_min, price_max, duration_label, cases_count, source_url, updated_at)")
    .eq("is_published", true);
  if (error) throw error;
  return data as Clinic[];
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  keyword: string;
  category: string | null;
  body_md: string;
  faq: { q: string; a: string }[];
  published_at: string;
  updated_at: string;
}

export async function getPublishedArticles(limit = 50): Promise<Article[]> {
  const db = getReadDb();
  if (!db) return [];
  const { data } = await db
    .from("articles")
    .select("slug, title, description, keyword, category, body_md, faq, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

export async function getArticle(slug: string): Promise<Article | null> {
  const db = getReadDb();
  if (!db) return null;
  const { data } = await db
    .from("articles")
    .select("slug, title, description, keyword, category, body_md, faq, published_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as Article | null;
}

export interface Sponsor {
  id: string;
  clinic_name: string;
  website_url: string | null;
  prefecture: string | null;
  clinic: Pick<Clinic, "slug" | "catch_copy" | "nearest_station" | "walk_minutes"> | null;
}

/** 決済が有効なPR枠（トップに表示する） */
export async function getActiveSponsors(): Promise<Sponsor[]> {
  const db = getReadDb();
  if (!db) return [];
  const { data } = await db
    .from("sponsorships")
    .select("id, clinic_name, website_url, prefecture, clinic:clinics(slug, catch_copy, nearest_station, walk_minutes)")
    .eq("status", "active")
    .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(6);
  return (data ?? []) as unknown as Sponsor[];
}

/** エリア × 治療の価格統計（記事とランディングページで「独自データ」として使う） */
export function priceStats(clinics: Clinic[], category: TreatmentCategory, prefecture?: string) {
  const prefix = { whitening: "whitening", orthodontics: "ortho", implant: "implant", cleaning: "cleaning" }[category];
  const rows = clinics
    .filter((c) => !prefecture || c.prefecture === prefecture)
    .flatMap((c) => c.treatments.filter((t) => t.option_code.startsWith(prefix)).map((t) => ({ clinic: c, t })));
  const byOption = new Map<string, { min: number; max: number; count: number }>();
  for (const { t } of rows) {
    const s = byOption.get(t.option_code) ?? { min: Infinity, max: 0, count: 0 };
    byOption.set(t.option_code, { min: Math.min(s.min, t.price_min), max: Math.max(s.max, t.price_max), count: s.count + 1 });
  }
  return { clinicCount: new Set(rows.map((r) => r.clinic.id)).size, byOption };
}

/** 路線図に渡す軽量データ（山手線駅にひもづく医院だけ） */
export function toMapClinics(clinics: Clinic[]) {
  return clinics
    .filter((c): c is Clinic & { station_slug: string } => !!c.station_slug)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      station_slug: c.station_slug,
      nearest_station: c.nearest_station,
      walk_minutes: c.walk_minutes,
      catch_copy: c.catch_copy,
      treatments: c.treatments.map((t) => ({ option_code: t.option_code, price_min: t.price_min })),
    }));
}
