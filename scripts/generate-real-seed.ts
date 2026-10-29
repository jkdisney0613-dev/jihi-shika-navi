// lib/real-clinics.ts から supabase/007_real_clinics.sql を生成する
// 実行: npx tsx scripts/generate-real-seed.ts > supabase/007_real_clinics.sql
import { REAL_CLINICS } from "../lib/real-clinics";

const CATEGORY_BY_PREFIX: Record<string, string> = { whitening: "whitening", ortho: "orthodontics", implant: "implant", cleaning: "cleaning" };
const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => `'{${xs.join(",")}}'`;

const lines = [
  "-- 実在の医院（渋谷・ホワイトニングと矯正）と、本番運用のための列の追加。scripts/generate-real-seed.ts で生成。",
  "-- 006_legal.sql の後に実行してください。何度流しても同じ結果になります。",
  "begin;",
  "",
  "alter table public.clinics add column if not exists address text;            -- 公式サイト記載の所在地",
  "alter table public.clinic_treatments add column if not exists price_note text; -- 税表記なし・検査料別などの注記",
  "alter table public.station_research add column if not exists exhausted_at timestamptz; -- 新しい医院が見つからなくなった日（次の駅へ進む）",
  "create index if not exists clinics_created_auto_idx on public.clinics (created_at) where source = 'auto_research';",
  "",
  "-- テスト公開用の架空医院は本番では出さない",
  "update public.clinics set is_published = false where id::text like '00000000-0000-4000-8000-%';",
  "",
];
for (const c of REAL_CLINICS) {
  lines.push(
    `insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values (` +
      [q(c.id), q(c.slug), q(c.station_slug), q(c.name), q(c.address), q(c.prefecture), q(c.city), q(c.nearest_station), c.walk_minutes, arr(c.features), q(c.catch_copy), q(c.website_url), "'manual'", q(c.verified_at), "true"].join(", ") +
      `) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;`,
  );
  for (const t of c.treatments) {
    lines.push(
      `insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values (` +
        [q(c.id), q(CATEGORY_BY_PREFIX[t.option_code.split("_")[0]]), q(t.option_code), t.price_min, t.price_max, q(t.duration_label), 0, q(t.source_url), q(t.price_note), q(t.updated_at)].join(", ") +
        `) on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;`,
    );
  }
}
lines.push("", "commit;");
console.log(lines.join("\n"));
