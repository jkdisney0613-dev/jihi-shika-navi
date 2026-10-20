// lib/sample-clinics.ts から supabase/seed.sql を生成する
// 実行: npx tsx scripts/generate-seed.ts > supabase/seed.sql
import { SAMPLE_CLINICS } from "../lib/sample-clinics";

const CATEGORY_BY_PREFIX: Record<string, string> = {
  whitening: "whitening",
  ortho: "orthodontics",
  implant: "implant",
  cleaning: "cleaning",
};

const q = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => `'{${xs.join(",")}}'`;

const lines = ["-- サンプル医院データ（架空）。scripts/generate-seed.ts で生成。003_yamanote.sql まで実行してから流してください", "begin;"];
for (const c of SAMPLE_CLINICS) {
  lines.push(
    `insert into public.clinics (id, slug, station_slug, name, prefecture, city, nearest_station, walk_minutes, rating, review_count, features, catch_copy, image_url, booking_url) values (` +
      [q(c.id), q(c.slug), q(c.station_slug), q(c.name), q(c.prefecture), q(c.city), q(c.nearest_station), c.walk_minutes, c.rating, c.review_count, arr(c.features), q(c.catch_copy), q(c.image_url), q(c.booking_url)].join(", ") +
      `) on conflict (id) do nothing;`,
  );
  for (const t of c.treatments) {
    const category = CATEGORY_BY_PREFIX[t.option_code.split("_")[0]];
    lines.push(
      `insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count) values (` +
        [q(c.id), q(category), q(t.option_code), t.price_min, t.price_max, q(t.duration_label), t.cases_count].join(", ") +
        `) on conflict (clinic_id, option_code) do nothing;`,
    );
  }
}
lines.push("commit;");
console.log(lines.join("\n"));
