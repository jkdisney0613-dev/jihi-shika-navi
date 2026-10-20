"use client";

// 山手線の路線図。駅を押すと、その駅（なければ近くの駅）のおすすめ医院が下に出る
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, formatPrice } from "@/lib/options";
import type { TreatmentCategory } from "@/lib/types";
import { YAMANOTE, stationDistance } from "@/lib/yamanote";

export interface MapClinic {
  slug: string;
  name: string;
  station_slug: string;
  nearest_station: string;
  walk_minutes: number;
  rating: number;
  catch_copy: string;
  treatments: { option_code: string; price_min: number }[];
}

const PREFIX: Record<TreatmentCategory, string> = { whitening: "whitening", orthodontics: "ortho", implant: "implant", cleaning: "cleaning" };

// 環状線の形（実際の路線に近い縦長の楕円）。東京駅を右、品川を下、新宿を左、池袋を左上に置く
const CX = 210, CY = 260, RX = 128, RY = 178;
const position = (i: number) => {
  const angle = (-8 + (360 / YAMANOTE.length) * i) * (Math.PI / 180);
  return { x: CX + RX * Math.cos(angle), y: CY + RY * Math.sin(angle), cos: Math.cos(angle), sin: Math.sin(angle) };
};

export default function YamanoteMap({ clinics }: { clinics: MapClinic[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<TreatmentCategory | "all">("all");

  const matchesCategory = (c: MapClinic) =>
    category === "all" || c.treatments.some((t) => t.option_code.startsWith(PREFIX[category]));

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clinics) if (matchesCategory(c)) m.set(c.station_slug, (m.get(c.station_slug) ?? 0) + 1);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinics, category]);

  // 選んだ駅の医院。なければ山手線で2駅以内の医院を近い順に出す
  const results = useMemo(() => {
    if (!selected) return [];
    return clinics
      .filter(matchesCategory)
      .map((c) => ({ c, d: stationDistance(selected, c.station_slug) }))
      .filter((x): x is { c: MapClinic; d: number } => x.d !== null && x.d <= 2)
      .sort((a, b) => a.d - b.d || b.c.rating - a.c.rating)
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinics, selected, category]);

  const station = YAMANOTE.find((s) => s.slug === selected);
  const minPrice = (c: MapClinic) => {
    const ts = c.treatments.filter((t) => category === "all" || t.option_code.startsWith(PREFIX[category]));
    return ts.length ? Math.min(...ts.map((t) => t.price_min)) : null;
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* 治療で絞り込み */}
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {[{ value: "all" as const, label: "すべて" }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={category === c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
              category === c.value ? "border-lime-600 bg-lime-600 text-white" : "border-gray-300 bg-white text-gray-600 hover:border-lime-500"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 420 520" className="w-full select-none" role="group" aria-label="山手線の路線図。駅を選ぶとおすすめの歯科医院が表示されます">
        {/* 線路 */}
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#80C241" strokeWidth={10} />
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 8" opacity={0.7} />

        {/* 中央のガイド */}
        <text x={CX} y={CY - 14} textAnchor="middle" className="fill-lime-700" fontSize={22} fontWeight={700}>山手線</text>
        <text x={CX} y={CY + 12} textAnchor="middle" className="fill-gray-500" fontSize={12}>駅を押すと</text>
        <text x={CX} y={CY + 28} textAnchor="middle" className="fill-gray-500" fontSize={12}>おすすめの医院が出ます</text>

        {YAMANOTE.map((s, i) => {
          const { x, y, cos, sin } = position(i);
          const count = counts.get(s.slug) ?? 0;
          const active = selected === s.slug;
          const anchor = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
          // 上下の駅は駅名が横に並んで重なるので、1駅おきに外側へずらす
          const dist = anchor === "middle" && i % 2 === 1 ? 38 : 22;
          const lx = x + cos * dist, ly = y + sin * dist + 4;
          return (
            <g
              key={s.slug}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${s.name}駅（掲載${count}院）`}
              onClick={() => setSelected(s.slug)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(s.slug))}
              className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-sky-500"
            >
              {/* 押しやすいよう透明の当たり判定を広めに取る */}
              <circle cx={x} cy={y} r={16} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={active ? 11 : count > 0 ? 8.5 : 6}
                fill={active ? "#0284c7" : count > 0 ? "#80C241" : "#fff"}
                stroke={active ? "#0369a1" : "#4d7c0f"}
                strokeWidth={2.5}
                className="transition-all"
              />
              {count > 0 && (
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize={active ? 11 : 9} fontWeight={700} fill="#fff" pointerEvents="none">
                  {count}
                </text>
              )}
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize={active ? 13 : 11}
                fontWeight={active || count > 0 ? 700 : 400}
                className={active ? "fill-sky-700" : count > 0 ? "fill-gray-900" : "fill-gray-400"}
              >
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="-mt-2 mb-4 text-center text-xs text-gray-500">緑の丸の数字は掲載医院数。白い駅はリサーチ中です。</p>

      {/* 選んだ駅のおすすめ */}
      <div aria-live="polite">
        {station && (
          <div className="rounded-2xl border border-lime-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg font-bold text-gray-900">{station.name}駅周辺のおすすめ</h3>
              <Link href={`/station/${station.slug}`} className="text-xs text-sky-700 hover:underline">駅のページへ</Link>
            </div>
            {results.length === 0 ? (
              <p className="text-sm text-gray-500">この駅の周辺はただいまリサーチ中です。近くの駅もお試しください。</p>
            ) : (
              <ul className="space-y-3">
                {results.map(({ c, d }) => {
                  const price = minPrice(c);
                  return (
                    <li key={c.slug}>
                      <Link href={`/clinics/${c.slug}`} className="block rounded-xl border border-gray-100 p-3 hover:border-lime-400">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-bold text-gray-900">{c.name}</span>
                          <span className="shrink-0 text-xs text-amber-600">★{c.rating.toFixed(1)}</span>
                        </span>
                        <span className="block text-xs text-gray-500">
                          {d === 0 ? `${c.nearest_station} 徒歩${c.walk_minutes}分` : `隣の${d === 1 ? "" : "隣の"}駅・${c.nearest_station}`}
                          {price !== null && `・${formatPrice(price)}〜`}
                        </span>
                        <span className="mt-1 block text-sm text-gray-700">{c.catch_copy}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href={`/diagnosis?station=${station.slug}`}
              className="mt-4 block rounded-xl bg-sky-600 py-3 text-center text-sm font-bold text-white hover:bg-sky-700"
            >
              {station.name}駅で予算に合う医院を診断する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
