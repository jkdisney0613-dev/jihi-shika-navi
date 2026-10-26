// 山手線30駅のマスタ（外回り順：東京 → 品川 → 渋谷 → 新宿 → 池袋 → 上野 → 東京）
// 医院は「最寄りの山手線駅」でひもづけ、STATION_PRIORITY の順にリサーチして表示する

export interface YamanoteStation {
  slug: string;
  name: string; // 駅名（「駅」なし）
  kana: string;
}

export const YAMANOTE: YamanoteStation[] = [
  { slug: "tokyo", name: "東京", kana: "とうきょう" },
  { slug: "yurakucho", name: "有楽町", kana: "ゆうらくちょう" },
  { slug: "shimbashi", name: "新橋", kana: "しんばし" },
  { slug: "hamamatsucho", name: "浜松町", kana: "はままつちょう" },
  { slug: "tamachi", name: "田町", kana: "たまち" },
  { slug: "takanawa-gateway", name: "高輪ゲートウェイ", kana: "たかなわげーとうぇい" },
  { slug: "shinagawa", name: "品川", kana: "しながわ" },
  { slug: "osaki", name: "大崎", kana: "おおさき" },
  { slug: "gotanda", name: "五反田", kana: "ごたんだ" },
  { slug: "meguro", name: "目黒", kana: "めぐろ" },
  { slug: "ebisu", name: "恵比寿", kana: "えびす" },
  { slug: "shibuya", name: "渋谷", kana: "しぶや" },
  { slug: "harajuku", name: "原宿", kana: "はらじゅく" },
  { slug: "yoyogi", name: "代々木", kana: "よよぎ" },
  { slug: "shinjuku", name: "新宿", kana: "しんじゅく" },
  { slug: "shin-okubo", name: "新大久保", kana: "しんおおくぼ" },
  { slug: "takadanobaba", name: "高田馬場", kana: "たかだのばば" },
  { slug: "mejiro", name: "目白", kana: "めじろ" },
  { slug: "ikebukuro", name: "池袋", kana: "いけぶくろ" },
  { slug: "otsuka", name: "大塚", kana: "おおつか" },
  { slug: "sugamo", name: "巣鴨", kana: "すがも" },
  { slug: "komagome", name: "駒込", kana: "こまごめ" },
  { slug: "tabata", name: "田端", kana: "たばた" },
  { slug: "nishi-nippori", name: "西日暮里", kana: "にしにっぽり" },
  { slug: "nippori", name: "日暮里", kana: "にっぽり" },
  { slug: "uguisudani", name: "鶯谷", kana: "うぐいすだに" },
  { slug: "ueno", name: "上野", kana: "うえの" },
  { slug: "okachimachi", name: "御徒町", kana: "おかちまち" },
  { slug: "akihabara", name: "秋葉原", kana: "あきはばら" },
  { slug: "kanda", name: "神田", kana: "かんだ" },
];

export const stationBySlug = (slug: string | null | undefined) => YAMANOTE.find((s) => s.slug === slug) ?? null;

/** 環状線上の駅数の差（隣の駅なら1）。どちらかが山手線外なら null */
export function stationDistance(a: string | null | undefined, b: string | null | undefined): number | null {
  const i = YAMANOTE.findIndex((s) => s.slug === a);
  const j = YAMANOTE.findIndex((s) => s.slug === b);
  if (i < 0 || j < 0) return null;
  const d = Math.abs(i - j);
  return Math.min(d, YAMANOTE.length - d);
}

/**
 * 医院を集める駅の順番。20〜30代の利用が多い駅から先に埋める。
 * 土台は JR東日本「各駅の乗車人員 2024年度」（1日平均）。駅ごとの年代別データは公開されていないため、
 * 渋谷・新宿・池袋を先頭に固定し、若い世代が集まる街（恵比寿・原宿・高田馬場・新大久保）を乗車人員の順位より前に出している。
 * 1駅あたり PER_STATION_TARGET 件たまるか、検索で新しい医院が見つからなくなったら次の駅へ進む。
 */
export const STATION_PRIORITY: string[] = [
  "shibuya", "shinjuku", "ikebukuro", // 指定の主要3駅
  "ebisu", "harajuku", "takadanobaba", // 20〜30代が多い街
  "tokyo", "shinagawa", "akihabara", "ueno", "shimbashi", "yurakucho", // 乗車人員の上位
  "osaki", "gotanda", "meguro", "shin-okubo", "yoyogi", "hamamatsucho", "tamachi",
  "nippori", "nishi-nippori", "kanda", "okachimachi", "otsuka", "mejiro",
  "komagome", "tabata", "sugamo", "uguisudani", "takanawa-gateway",
];

export const PER_STATION_TARGET = 20;
