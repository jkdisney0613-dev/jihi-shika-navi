// トップページのおすすめ枠（ステマ規制に対応して「PR」を明示）
import Link from "next/link";
import type { Sponsor } from "@/lib/data";

export default function SponsoredClinics({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-1 text-lg font-bold text-gray-900">おすすめの歯科医院</h2>
      <p className="mb-4 text-xs text-gray-500">PR：掲載料をいただいている医院です。診断結果の順位には影響しません。</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sponsors.map((s) => {
          const href = s.clinic ? `/clinics/${s.clinic.slug}` : s.website_url ?? "#";
          return (
            <li key={s.id} className="relative rounded-xl border border-gray-200 bg-white p-4">
              <span className="absolute right-3 top-3 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">PR</span>
              <Link href={href} rel={s.clinic ? undefined : "sponsored noopener"} className="font-bold text-sky-700 hover:underline">
                {s.clinic_name}
              </Link>
              <p className="mt-1 text-xs text-gray-500">
                {s.prefecture}
                {s.clinic && `・${s.clinic.nearest_station} 徒歩${s.clinic.walk_minutes}分`}
              </p>
              {s.clinic?.catch_copy && <p className="mt-2 text-sm text-gray-700">{s.clinic.catch_copy}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
