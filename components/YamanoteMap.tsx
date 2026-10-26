"use client";

// 山手線の路線図。駅を押すと、その駅（なければ近くの駅）の医院が近い順に下に出る
import Link from "next/link";
import { Kiwi_Maru } from "next/font/google";
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
  catch_copy: string;
  treatments: { option_code: string; price_min: number }[];
}

const PREFIX: Record<TreatmentCategory, string> = { whitening: "whitening", orthodontics: "ortho", implant: "implant", cleaning: "cleaning" };

// 手書き風の路線図（いただいたイラストに合わせる）。角の丸い四角に近い環状線で、東京駅を右、品川を下、新宿を左、池袋を左上に置く
const CX = 210, CY = 285, RX = 126, RY = 172, SQUARE = 3.2;
const curve = (deg: number) => {
  const a = deg * (Math.PI / 180), c = Math.cos(a), s = Math.sin(a);
  const k = 2 / SQUARE;
  return { x: CX + RX * Math.sign(c) * Math.abs(c) ** k, y: CY + RY * Math.sign(s) * Math.abs(s) ** k, cos: c, sin: s };
};
const TRACK = Array.from({ length: 121 }, (_, i) => curve(i * 3)).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("") + "Z";
// 駅は線路の長さに沿って等間隔に置く（角に駅が寄らないように）。東京駅は右の少し上から始める
const STATIONS = (() => {
  const pts = Array.from({ length: 1441 }, (_, i) => curve(-8 + i / 4));
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = acc[acc.length - 1];
  let j = 0;
  return YAMANOTE.map((_, i) => {
    const target = (total * i) / YAMANOTE.length;
    while (acc[j] < target) j++;
    const p = pts[j];
    // ラベルを出す向き：楕円の中心から外向き
    const nx = (p.x - CX) / RX, ny = (p.y - CY) / RY, len = Math.hypot(nx, ny);
    return { x: p.x, y: p.y, cos: nx / len, sin: ny / len };
  });
})();
const position = (i: number) => STATIONS[i];
const INK = "#2B2118";
// 背景の小さな点（手描きの余白の飾り）
const DOTS = [[30, 40], [44, 52], [388, 70], [398, 84], [24, 500], [36, 512], [392, 470], [380, 520], [60, 300], [362, 300]];

const kiwi = Kiwi_Maru({ weight: "500", subsets: ["latin"], preload: false, display: "swap" });

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
      .sort((a, b) => a.d - b.d || a.c.walk_minutes - b.c.walk_minutes)
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

      <div className={`${kiwi.className} rounded-3xl bg-[#C9DC52] p-1 shadow-inner`}>
        <svg viewBox="0 0 420 570" className="w-full select-none" role="group" aria-label="山手線の路線図。駅を選ぶと周辺の歯科医院が表示されます">
          <defs>
            {/* 線路を少しだけゆがませて手描きの線に見せる */}
            <filter id="hand" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={7} />
              <feDisplacementMap in="SourceGraphic" scale={4} />
            </filter>
          </defs>
          {DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} fill="#fff" opacity={0.8} />)}

          {/* 線路：白い帯に緑の枕木 */}
          <g filter="url(#hand)">
            <path d={TRACK} fill="none" stroke="#3F5F1E" strokeWidth={17} strokeLinejoin="round" />
            <path d={TRACK} fill="none" stroke="#FAFAE6" strokeWidth={12} strokeLinejoin="round" />
            <path d={TRACK} fill="none" stroke="#6B9A35" strokeWidth={12} strokeDasharray="12 26" />
          </g>

          {/* 中央のタイトルとビーバー */}
          <text x={CX} y={CY - 70} textAnchor="middle" fill={INK} fontSize={44}>山手線</text>
          <text x={CX} y={CY - 44} textAnchor="middle" fill={INK} fontSize={15}>Yamanote Line</text>
          <text x={CX} y={CY - 18} textAnchor="middle" fill="#4A3B2C" fontSize={12}>駅を押すと周辺の医院が出ます</text>
          <image href="/beaver/search.png" x={CX - 50} y={CY - 4} width={100} height={105} />

          {YAMANOTE.map((s, i) => {
            const { x, y, cos, sin } = position(i);
            const count = counts.get(s.slug) ?? 0;
            const active = selected === s.slug;
            const vertical = Math.abs(cos) < 0.45; // 上と下の駅は縦書きにして重ならないようにする
            const size = s.name.length >= 4 ? 13 : 15;
            const fill = active ? "#B4471C" : INK;
            let label: React.ReactNode;
            if (vertical) {
              const chars = [...(s.slug === "takanawa-gateway" ? "高輪" : s.name)];
              const lh = size + 1;
              const y0 = sin < 0 ? y - 20 - (chars.length - 1) * lh : y + 20 + size - 2;
              label = chars.map((ch, j) => (
                <text key={j} x={x} y={y0 + j * lh} textAnchor="middle" fontSize={size} fill={fill}>{ch}</text>
              ));
            } else {
              const anchor = cos > 0 ? "start" : "end";
              const lx = x + (cos > 0 ? 17 : -17), ly = y + sin * 8 + 5;
              label = s.slug === "takanawa-gateway" ? (
                <>
                  <text x={lx} y={ly - 3} textAnchor={anchor} fontSize={14} fill={fill}>高輪</text>
                  <text x={lx} y={ly + 11} textAnchor={anchor} fontSize={10} fill={fill}>ゲートウェイ</text>
                </>
              ) : (
                <text x={lx} y={ly} textAnchor={anchor} fontSize={size} fill={fill}>{s.name}</text>
              );
            }
            return (
              <g
                key={s.slug}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${s.name}駅（掲載${count}院）`}
                onClick={() => setSelected(s.slug)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(s.slug))}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-sky-600"
              >
                {/* 押しやすいよう透明の当たり判定を広めに取る */}
                <circle cx={x} cy={y} r={18} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 13 : count > 0 ? 11.5 : 9}
                  fill={active ? "#B4471C" : count > 0 ? "#FFE27A" : "#EEF2D3"}
                  stroke={INK}
                  strokeWidth={2.6}
                  className="transition-all"
                />
                {count > 0 && (
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={active ? 12 : 11} fill={active ? "#fff" : INK} pointerEvents="none">
                    {count}
                  </text>
                )}
                {label}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mb-4 mt-2 text-center text-xs text-gray-500">黄色い駅の数字は掲載医院数。白い駅はリサーチ中です。</p>

      {/* 選んだ駅の医院 */}
      <div aria-live="polite">
        {station && (
          <div className="rounded-2xl border border-lime-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg font-bold text-gray-900">{station.name}駅周辺の医院</h3>
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
              {station.name}駅で予算に合う医院を探す
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
