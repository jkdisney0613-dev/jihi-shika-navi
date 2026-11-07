// 実在する医院のデータ（山手線の駅ごと・ホワイトニングと矯正）。渋谷の16院は 2026-10-26、以降は各医院の verified_at の日に各医院の公式サイトの料金ページで確認した内容です。
// 掲載しているのは公式サイトで公開されている情報（医院名・所在地・診療時間・料金）だけで、口コミ・評価・症例写真は扱いません。
// 料金は公式サイトの記載どおり（税込と明記されたものは税込）。税表記がないものは price_note にその旨を書いています。
// 本番では DB の医院に、このファイルにしかない医院を足して表示する（lib/data.ts の codeOnlyClinics）。追加の手順は docs/ADD_CLINICS.md。
// Supabase 未接続の本番（NEXT_PUBLIC_DEMO_MODE が true でない）ではこのデータだけを表示し、
// supabase/007_real_clinics.sql はこのファイルから生成しています（scripts/generate-real-seed.ts）。
import type { Clinic, ClinicTreatment } from "./types";

export const REAL_VERIFIED_AT = "2026-10-26T00:00:00+09:00";

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type T = Omit<ClinicTreatment, "cases_count" | "updated_at">;
const t = (option_code: T["option_code"], price_min: number, price_max: number, duration_label: string, source_url: string, price_note?: string): ClinicTreatment => ({
  option_code, price_min, price_max, duration_label, cases_count: 0, source_url, updated_at: REAL_VERIFIED_AT, ...(price_note ? { price_note } : {}),
});

const NO_TAX = "公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています";

type C = Omit<Clinic, "prefecture" | "city" | "nearest_station" | "station_slug" | "image_url" | "booking_url" | "verified_at">;
const shibuya = (c: C): Clinic => ({
  prefecture: "東京都", city: "渋谷区", nearest_station: "渋谷駅", station_slug: "shibuya",
  image_url: null, booking_url: null, verified_at: REAL_VERIFIED_AT, ...c,
});

/** 渋谷以外の駅。verifiedAt は公式サイトで確認した日（例 "2026-10-30"） */
const at = (station_slug: string, nearest_station: string, city: string, verifiedAt: string) => (c: C): Clinic => ({
  prefecture: "東京都", city, nearest_station, station_slug,
  image_url: null, booking_url: null, ...c, verified_at: `${verifiedAt}T00:00:00+09:00`,
  treatments: c.treatments.map((x) => ({ ...x, updated_at: `${verifiedAt}T00:00:00+09:00` })),
});
// 例：const shinjuku = at("shinjuku", "新宿駅", "新宿区", "2026-10-30");
const shibuya1029 = at("shibuya", "渋谷駅", "渋谷区", "2026-10-29");
const shinjuku = at("shinjuku", "新宿駅", "新宿区", "2026-10-29");
const shinjuku1030 = at("shinjuku", "新宿駅", "新宿区", "2026-10-30");
const shinjukuSendagaya1030 = at("shinjuku", "新宿駅", "渋谷区", "2026-10-30");
const shinjuku1031 = at("shinjuku", "新宿駅", "新宿区", "2026-10-31");
const ikebukuro1031 = at("ikebukuro", "池袋駅", "豊島区", "2026-10-31");
const ikebukuro1101 = at("ikebukuro", "池袋駅", "豊島区", "2026-11-01");
const ikebukuro1102 = at("ikebukuro", "池袋駅", "豊島区", "2026-11-02");
const ebisu1102 = at("ebisu", "恵比寿駅", "渋谷区", "2026-11-02");
const ebisu1103 = at("ebisu", "恵比寿駅", "渋谷区", "2026-11-03");
const ebisu1104 = at("ebisu", "恵比寿駅", "渋谷区", "2026-11-04");
const harajuku1104 = at("harajuku", "原宿駅", "渋谷区", "2026-11-04");
const ebisu1105 = at("ebisu", "恵比寿駅", "渋谷区", "2026-11-05");
const harajuku1105 = at("harajuku", "原宿駅", "渋谷区", "2026-11-05");
const takadanobaba1105 = at("takadanobaba", "高田馬場駅", "新宿区", "2026-11-05");
const takadanobaba1106 = at("takadanobaba", "高田馬場駅", "新宿区", "2026-11-06");
const takadanobabaToshima1106 = at("takadanobaba", "高田馬場駅", "豊島区", "2026-11-06");


export const REAL_CLINICS: Clinic[] = [
  shibuya({
    id: id(1), slug: "shibuya-haplus-dental", name: "渋谷ハプラス歯科",
    address: "東京都渋谷区神南1-23-13 丸大ビル8階", walk_minutes: 3, website_url: "https://www.haplus-shibuya.com/",
    features: ["access", "weekend"],
    catch_copy: "平日・土曜は21時まで診療。ホワイトニングと表側・裏側・部分矯正に対応",
    treatments: [
      t("whitening_office", 31_900, 31_900, "1クール（1回約90分）", "https://www.haplus-shibuya.com/treatment/aesthetic-dentistry/whitening/", "1クールの料金。白さによっては複数回必要"),
      t("whitening_home", 36_300, 36_300, "2〜6週間", "https://www.haplus-shibuya.com/treatment/aesthetic-dentistry/whitening/"),
      t("ortho_wire", 748_000, 748_000, "1年半〜3年程度", "https://www.haplus-shibuya.com/treatment/ortho/wire/", "初回検査11,000円・調整料5,500円/回は別"),
      t("ortho_lingual", 1_210_000, 1_210_000, "1年半〜3年程度", "https://www.haplus-shibuya.com/treatment/ortho/wire/", "初回検査11,000円・調整料5,500円/回は別"),
      t("ortho_partial", 550_000, 550_000, "3ヶ月〜1年程度", "https://www.haplus-shibuya.com/treatment/ortho/wire/", "初回検査11,000円・調整料5,500円/回は別"),
    ],
  }),
  shibuya({
    id: id(2), slug: "shibuya-shika-jinnan", name: "渋谷歯科",
    address: "東京都渋谷区神南1-22-8 渋谷東栄ビル9階", walk_minutes: 3, website_url: "https://www.shibuya-shinbi.jp/",
    features: ["price", "access", "weekend"],
    catch_copy: "オフィスホワイトニングは1回と3回セットから選べる。土日も19時まで診療",
    treatments: [
      t("whitening_office", 4_400, 9_900, "1回〜3回セット", "https://www.shibuya-shinbi.jp/whitening-treatment/", "1回4,400円・3回セット9,900円"),
      t("whitening_home", 13_200, 13_200, "ジェル2本付き", "https://www.shibuya-shinbi.jp/whitening-treatment/"),
    ],
  }),
  shibuya({
    id: id(3), slug: "shibuya-miyamasuzaka-dental", name: "渋谷宮益坂歯科",
    address: "東京都渋谷区渋谷1-14-9 藤和宮益坂ビル6F", walk_minutes: 1, website_url: "https://www.shika-tanaka.com/",
    features: ["price", "access", "weekend"],
    catch_copy: "渋谷駅東口から徒歩1分。土日も診療（祝日休診）",
    treatments: [
      t("whitening_office", 4_400, 4_400, "1回（1日最大3回）", "https://www.shika-tanaka.com/about-whitening/", "1回あたりの料金"),
      t("whitening_home", 13_200, 13_200, "マウスピースとジェル2本", "https://www.shika-tanaka.com/about-whitening/"),
    ],
  }),
  shibuya({
    id: id(4), slug: "sakura-platinum-dental", name: "さくらプラチナム歯科",
    address: "東京都渋谷区渋谷2-22-13 渋谷東口マイアミビル5F・6F", walk_minutes: 1, website_url: "https://www.sakurashika24-3.com/",
    features: ["price", "access", "weekend"],
    catch_copy: "年中無休で深夜まで診療。照射回数ごとに選べるホワイトニングプラン",
    treatments: [
      t("whitening_office", 2_200, 33_000, "1回8分の照射から（プランにより異なる）", "https://www.sakurashika24-3.com/office-whitening", "最安は8分×1回。回数・痛みに配慮したプランで料金が変わる"),
      t("whitening_dual", 50_700, 103_000, "コースにより異なる", "https://www.sakurashika24-3.com/dual-whitening"),
    ],
  }),
  shibuya({
    id: id(5), slug: "my-dental-clinic-shibuya", name: "MYデンタルクリニック渋谷",
    address: "東京都渋谷区宇田川町36-1 SANWA SHIBUYA Bldg. 3F", walk_minutes: 6, website_url: "https://mydec.jp/",
    features: ["weekend"],
    catch_copy: "10時〜21時診療。オフィスホワイトニングは続けて通うと2回目以降の料金が下がる",
    treatments: [
      t("whitening_office", 11_000, 22_000, "1回90分（継続プラン）", "https://mydec.jp/whitening/", "初回22,000円、2回目16,500円、3回目以降11,000円"),
      t("whitening_home", 33_000, 33_000, "1回", "https://mydec.jp/whitening/"),
      t("whitening_dual", 44_000, 44_000, "1回", "https://mydec.jp/whitening/"),
    ],
  }),
  shibuya({
    id: id(6), slug: "shibuya-ohno-dental", name: "渋谷おおの歯科・矯正歯科",
    address: "東京都渋谷区渋谷3-18-8 大野ビル4階", walk_minutes: 1, website_url: "https://shibuya-ohno-dental.com/",
    features: ["access", "weekend"],
    catch_copy: "渋谷駅C2出口から徒歩1分。平日は21時まで、土曜も診療",
    treatments: [
      t("whitening_office", 19_800, 22_000, "1回", "https://shibuya-ohno-dental.com/price/", "薬剤（ティオン／オパールエッセンス）で料金が変わる"),
      t("whitening_dual", 39_800, 39_800, "オフィス＋ホーム", "https://shibuya-ohno-dental.com/price/"),
      t("ortho_aligner", 660_000, 1_155_000, "記載なし", "https://shibuya-ohno-dental.com/price/", "インビザライン・エンジェルアライナー。精密検査・診断料33,000円は別"),
      t("ortho_wire", 990_000, 1_100_000, "記載なし", "https://shibuya-ohno-dental.com/price/", "調整料・保定装置込み。精密検査・診断料33,000円は別"),
      t("ortho_lingual", 1_375_000, 1_870_000, "記載なし", "https://shibuya-ohno-dental.com/price/", "ハーフ〜フルリンガル。精密検査・診断料33,000円は別"),
    ],
  }),
  shibuya({
    id: id(7), slug: "shibuya-fb-kyousei", name: "渋谷F&B矯正歯科・東京",
    address: "東京都渋谷区松濤1-29-1 渋谷クロスロードビル5F", walk_minutes: 5, website_url: "https://fb-kyousei.com/",
    features: ["weekend"],
    catch_copy: "調整料・保定料込みのトータルフィー制。月曜〜日曜に診療（不定休）",
    treatments: [
      t("ortho_aligner", 330_000, 880_000, "記載なし", "https://fb-kyousei.com/cost/", "インビザライン・ハナラビのプランで異なる。精密検査3,300円は別"),
      t("ortho_wire", 902_000, 902_000, "記載なし", "https://fb-kyousei.com/cost/", "クリアブラケット・ホワイトワイヤー。精密検査3,300円は別"),
      t("ortho_lingual", 1_210_000, 1_408_000, "記載なし", "https://fb-kyousei.com/cost/", "ハーフ〜フルリンガル。精密検査3,300円は別"),
      t("ortho_partial", 165_000, 495_000, "記載なし", "https://fb-kyousei.com/cost/", "症状・装置による"),
      t("whitening_office", 16_500, 16_500, "1回", "https://fb-kyousei.com/cost/"),
      t("whitening_home", 33_000, 33_000, "上下トレー", "https://fb-kyousei.com/cost/"),
    ],
  }),
  shibuya({
    id: id(8), slug: "shibuya-central-kyousei", name: "渋谷セントラル矯正歯科",
    address: "東京都渋谷区宇田川町33-1 グランド東京渋谷7F", walk_minutes: 5, website_url: "https://kireiha.com/",
    features: ["weekend"],
    catch_copy: "難易度別の料金と治療期間の目安を公開。平日は20時半まで、日曜も診療",
    treatments: [
      t("ortho_wire", 890_000, 1_040_000, "9ヶ月〜30ヶ月", "https://kireiha.com/price/", "難易度A〜Fで異なる。検査・診断50,000円は別"),
      t("ortho_lingual", 1_060_000, 1_470_000, "9ヶ月〜30ヶ月", "https://kireiha.com/price/", "ハーフ〜フルリンガル。検査・診断50,000円は別"),
      t("ortho_aligner", 270_000, 800_000, "記載なし", "https://kireiha.com/price/", "インビザラインのプランで異なる。検査・診断50,000円は別"),
      t("ortho_partial", 420_000, 820_000, "5ヶ月〜14ヶ月", "https://kireiha.com/price/", "裏側の部分矯正。検査・診断50,000円は別"),
    ],
  }),
  shibuya({
    id: id(9), slug: "shibuya-miyashita-park-dental", name: "渋谷宮下パーク歯科・矯正歯科",
    address: "東京都渋谷区渋谷1-24-7 宮下パークビル2F", walk_minutes: 1, website_url: "https://sm-dc.com/",
    features: ["access", "weekend"],
    catch_copy: "渋谷駅から徒歩1分。土日も診療。矯正とホワイトニングの料金表を公開",
    treatments: [
      t("ortho_aligner", 330_000, 990_000, "記載なし", "https://sm-dc.com/fee/", `${NO_TAX}。2026年8月に一部料金を改定と記載あり`),
      t("ortho_wire", 770_000, 990_000, "記載なし", "https://sm-dc.com/fee/", NO_TAX),
      t("ortho_lingual", 1_100_000, 1_330_000, "記載なし", "https://sm-dc.com/fee/", NO_TAX),
      t("ortho_partial", 248_000, 348_000, "記載なし", "https://sm-dc.com/fee/", `片顎の料金。${NO_TAX}`),
      t("whitening_office", 25_000, 25_000, "記載なし", "https://sm-dc.com/fee/"),
      t("whitening_home", 27_500, 27_500, "トレー＋ジェル", "https://sm-dc.com/fee/"),
      t("whitening_dual", 48_000, 48_000, "記載なし", "https://sm-dc.com/fee/"),
    ],
  }),
  shibuya({
    id: id(10), slug: "shibuya-dogenzaka-kyousei", name: "渋谷道玄坂矯正歯科",
    address: "東京都渋谷区道玄坂2-6-15 鈴井ビル6階", walk_minutes: 3, website_url: "https://www.shibuya-dogenzaka-kyousei.com/",
    features: ["access"],
    catch_copy: "矯正歯科。表側・裏側・マウスピース・部分矯正の料金を公開",
    treatments: [
      t("ortho_wire", 825_000, 990_000, "約24〜30ヶ月", "https://www.shibuya-dogenzaka-kyousei.com/price/", "税込表記。別の箇所に「別途消費税」の記載もあるため要確認。精密検査16,500円・調整料5,500円/月は別"),
      t("ortho_lingual", 1_210_000, 1_320_000, "約24〜30ヶ月", "https://www.shibuya-dogenzaka-kyousei.com/price/", "ハーフ〜フルリンガル。精密検査16,500円・調整料5,500円/月は別"),
      t("ortho_aligner", 990_000, 990_000, "記載なし", "https://www.shibuya-dogenzaka-kyousei.com/price/", "精密検査16,500円・調整料5,500円/月は別"),
      t("ortho_partial", 440_000, 440_000, "記載なし", "https://www.shibuya-dogenzaka-kyousei.com/price/"),
    ],
  }),
  shibuya({
    id: id(11), slug: "cs-kyousei-clinic", name: "CS矯正歯科クリニック",
    address: "東京都渋谷区宇田川町42-4 ワイリービル4F・5F", walk_minutes: 8, website_url: "https://www.cskyousei.com/",
    features: ["female_doctor", "weekend"],
    catch_copy: "女性医師が担当する矯正歯科（公式サイト記載）。土曜も診療・完全予約制",
    treatments: [
      t("ortho_wire", 500_000, 1_190_000, "1〜3年（永久歯列）", "https://www.cskyousei.com/orthodontics", `メタル〜ジルコニア装置。${NO_TAX}`),
      t("ortho_lingual", 1_380_000, 1_904_000, "1〜3年（永久歯列）", "https://www.cskyousei.com/orthodontics", NO_TAX),
      t("ortho_aligner", 830_000, 1_099_000, "1〜3年（永久歯列）", "https://www.cskyousei.com/orthodontics", NO_TAX),
    ],
  }),
  shibuya({
    id: id(12), slug: "shibuya-dd-dental", name: "渋谷DDデンタルクリニック",
    address: "東京都渋谷区道玄坂1-16-7 ハイウェービル7F", walk_minutes: 5, website_url: "https://dd-dentalclinic.jp/clinic/shibuyadental/",
    features: ["weekend"],
    catch_copy: "公式サイトの診療表では土日祝も診療。審美ワイヤー矯正とハーフリンガルに対応",
    treatments: [
      t("ortho_wire", 657_800, 701_800, "1年半〜3年程度", "https://dd-dentalclinic.jp/clinic/shibuyadental/wire", "クリアブラケット。再診料5,500円/回は別"),
      t("ortho_lingual", 767_800, 767_800, "記載なし", "https://dd-dentalclinic.jp/clinic/shibuyadental/wire", "ハーフリンガル（上が裏側・下が表側）。再診料5,500円/回は別"),
    ],
  }),
  shibuya({
    id: id(13), slug: "shibuya-louvre-dental", name: "渋谷ルーブル歯科・矯正歯科",
    address: "東京都渋谷区神南1-20-17 BC神南PROPERTY 6F", walk_minutes: 3, website_url: "https://www.shibuya-louvre-dental.com/",
    features: ["access", "weekend"],
    catch_copy: "マウスピース・表側・裏側・部分矯正の総額を公開。土日も診療",
    treatments: [
      t("ortho_aligner", 770_000, 880_000, "記載なし", "https://www.shibuya-louvre-dental.com/", "インビザラインの装置代総額"),
      t("ortho_wire", 660_000, 770_000, "記載なし", "https://www.shibuya-louvre-dental.com/", "装置代総額"),
      t("ortho_lingual", 990_000, 990_000, "記載なし", "https://www.shibuya-louvre-dental.com/", "装置代総額"),
      t("ortho_partial", 110_000, 550_000, "記載なし", "https://www.shibuya-louvre-dental.com/", "範囲により異なる"),
    ],
  }),
  shibuya({
    id: id(14), slug: "smile-access-shibuya", name: "スマイルアクセス矯正歯科 渋谷",
    address: "東京都渋谷区渋谷1-8-6 VORT渋谷宮益坂2F", walk_minutes: 3, website_url: "https://smile-access.com/clinic/shibuya/",
    features: ["access", "weekend"],
    catch_copy: "マウスピース矯正を症状の程度別の料金で案内。日曜も診療（金・土休診）",
    treatments: [
      t("ortho_aligner", 715_000, 935_000, "約6ヶ月〜2年以上", "https://smile-access.com/clinic/shibuya/", "精密検査38,500円は別"),
      t("ortho_partial", 165_000, 550_000, "約6ヶ月", "https://smile-access.com/clinic/shibuya/", "ワイヤー・マウスピースの部分矯正。精密検査38,500円は別"),
      t("ortho_wire", 880_000, 935_000, "約1年〜2年以上", "https://smile-access.com/clinic/shibuya/", "精密検査38,500円は別"),
    ],
  }),
  shibuya({
    id: id(15), slug: "shibuya-star-dental", name: "渋谷スター歯科",
    address: "東京都渋谷区渋谷1-24-15 ヒューリック渋谷宮益坂ビル6F", walk_minutes: 1, website_url: "https://starwhitening.net/shibuya/",
    features: ["price", "access"],
    catch_copy: "渋谷駅から徒歩1分。LEDライトのオフィスホワイトニングを照射回数別に案内",
    treatments: [
      t("whitening_office", 2_950, 7_228, "1〜3回（10分照射）", "https://starwhitening.net/shibuya/", NO_TAX),
    ],
  }),
  shibuya({
    id: id(16), slug: "oral-proportion-clinic", name: "オーラルプロポーションクリニック",
    address: "東京都渋谷区渋谷1-23-18 渋谷ワールドイーストビル8F", walk_minutes: 4, website_url: "https://www.oralpro.jp/",
    features: ["access"],
    catch_copy: "自費診療のみの完全予約制。東京メトロ渋谷駅B1出口から徒歩1分",
    treatments: [
      t("whitening_office", 38_500, 38_500, "記載なし", "https://www.oralpro.jp/price/", NO_TAX),
      t("whitening_home", 20_000, 20_000, "マウスピース上下", "https://www.oralpro.jp/price/", `ジェルは別。${NO_TAX}`),
      t("ortho_aligner", 484_000, 1_155_000, "記載なし", "https://www.oralpro.jp/price/", `インビザライン。検査・診断33,000円は別。${NO_TAX}`),
      t("ortho_wire", 990_000, 990_000, "記載なし", "https://www.oralpro.jp/price/", `検査・診断33,000円は別。${NO_TAX}`),
      t("ortho_lingual", 1_320_000, 1_320_000, "記載なし", "https://www.oralpro.jp/price/", `検査・診断33,000円は別。${NO_TAX}`),
    ],
  }),
  shibuya1029({
    id: id(17), slug: "shibuya-haisha-kyousei", name: "渋谷歯医者・矯正歯科",
    address: "東京都渋谷区渋谷2-20-11 渋谷協和ビル3F", walk_minutes: 1, website_url: "https://shibuya-haisha.com/",
    features: ["access", "weekend"],
    catch_copy: "銀座線渋谷駅出口から徒歩30秒。土日祝も10時〜21時まで診療",
    treatments: [
      t("whitening_office", 33_000, 33_000, "記載なし", "https://shibuya-haisha.com/price/", NO_TAX),
      t("whitening_home", 22_000, 22_000, "マウスピースとジェル2本", "https://shibuya-haisha.com/price/", NO_TAX),
      t("whitening_dual", 55_000, 55_000, "マウスピースとジェル2本付き", "https://shibuya-haisha.com/price/", NO_TAX),
      t("ortho_aligner", 440_000, 990_000, "記載なし", "https://shibuya-haisha.com/price/", `インビザライン（ハーフ〜アドバンス）の装置代。検査・診断55,000円・調整料5,500円/回は別。${NO_TAX}`),
      t("ortho_wire", 550_000, 550_000, "記載なし", "https://shibuya-haisha.com/price/", `表側矯正は550,000円〜。精密検査33,000円・通院観察料5,500円〜/回は別。${NO_TAX}`),
      t("ortho_lingual", 880_000, 990_000, "記載なし", "https://shibuya-haisha.com/price/", `ハーフリンガル880,000円・裏側990,000円。精密検査33,000円・通院観察料5,500円〜/回は別。${NO_TAX}`),
      t("ortho_partial", 220_000, 220_000, "記載なし", "https://shibuya-haisha.com/price/", `部分矯正は220,000円〜。精密検査33,000円は別。${NO_TAX}`),
    ],
  }),
  shibuya1029({
    id: id(18), slug: "shibuya-tokyo-kyousei-polaris", name: "渋谷東京矯正歯科",
    address: "東京都渋谷区神南1-12-16 和光ビル3階", walk_minutes: 3, website_url: "https://polaris-oc.com/",
    features: ["access"],
    catch_copy: "マウスピース矯正の総額を範囲別に公開。渋谷駅B1出口から徒歩3分",
    treatments: [
      t("ortho_aligner", 715_000, 935_000, "記載なし", "https://polaris-oc.com/%e6%96%99%e9%87%91%e3%81%ae%e3%81%94%e6%a1%88%e5%86%85/", `マウスピースの全体矯正（総額表示）。${NO_TAX}`),
      t("ortho_partial", 275_000, 605_000, "記載なし", "https://polaris-oc.com/%e6%96%99%e9%87%91%e3%81%ae%e3%81%94%e6%a1%88%e5%86%85/", `マウスピースのワンポイント〜部分矯正（総額表示）。${NO_TAX}`),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://polaris-oc.com/%e6%96%99%e9%87%91%e3%81%ae%e3%81%94%e6%a1%88%e5%86%85/", `ワイヤー矯正は調整料5,500円/月・保定装置38,500円がかかると記載あり。${NO_TAX}`),
    ],
  }),
  shibuya1029({
    id: id(19), slug: "ginza-dental-white-shibuya", name: "銀座デンタルホワイト渋谷院",
    address: "東京都渋谷区渋谷1-24-15 ヒューリック渋谷宮益坂ビル3階", walk_minutes: 3, website_url: "https://ginza-dw.com/shibuya/",
    features: ["price", "access", "weekend"],
    catch_copy: "ホワイトニング中心の歯科医院。年中無休（お盆・年末年始など一部休診あり）",
    treatments: [
      t("whitening_office", 6_600, 22_000, "1回60〜80分", "https://ginza-dw.com/menu/", "本数・薬剤のプランで料金が変わる。料金はグループ共通のメニューページの記載"),
      t("whitening_home", 33_000, 33_000, "マウスピース上下とジェル2本（約2週間分）", "https://ginza-dw.com/menu/", "料金はグループ共通のメニューページの記載"),
      t("whitening_dual", 61_600, 61_600, "オフィス16本とホームの組み合わせ", "https://ginza-dw.com/menu/", "料金はグループ共通のメニューページの記載"),
    ],
  }),
  shibuya1029({
    id: id(20), slug: "miyagishi-dental-clinic", name: "みやぎし歯科クリニック",
    address: "東京都渋谷区渋谷3-15-4 2F", walk_minutes: 5, website_url: "https://miyagishi-dental.com/",
    features: ["price"],
    catch_copy: "渋谷駅から徒歩5分。自費診療の費用をサイトで公開",
    treatments: [
      t("whitening_office", 16_500, 16_500, "1回", "https://miyagishi-dental.com/ownexpense.html", "公式サイトは税別表記のため、消費税10%を加えた額にしています（税別15,000円）"),
      t("ortho_partial", 110_000, 110_000, "記載なし", "https://miyagishi-dental.com/ownexpense.html", "MTM（1歯〜）は110,000円〜。公式サイトは税別表記のため、消費税10%を加えた額にしています（税別100,000円〜）"),
    ],
  }),
  shinjuku({
    id: id(21), slug: "kawaguchi-shika-shinjuku", name: "川口歯科診療所",
    address: "東京都新宿区西新宿6-5-1 新宿アイランドタワー2階", walk_minutes: 5, website_url: "https://www.kawaguchi-d.or.jp/",
    features: ["price"],
    catch_copy: "新宿駅西口から徒歩5分、都庁前駅から徒歩3分",
    treatments: [
      t("whitening_office", 11_000, 11_000, "1回約90分", "https://www.kawaguchi-d.or.jp/0530whitening/", "20歯の料金"),
      t("whitening_home", 27_500, 27_500, "1日2時間×14日間", "https://www.kawaguchi-d.or.jp/0530whitening/", "マウスピース上下22,000円と薬剤14回分5,500円の合計"),
    ],
  }),
  shinjuku({
    id: id(22), slug: "nishishinjuku-toyo-clinic", name: "西新宿歯科TOYOクリニック",
    address: "東京都新宿区西新宿1-19-7 岡崎ビル3F", walk_minutes: 3, website_url: "https://shinjuku-dental.jp/",
    features: ["access"],
    catch_copy: "JR新宿駅西口・南口から徒歩3分。新宿地下道7番出口すぐ",
    treatments: [
      t("whitening_office", 22_000, 22_000, "記載なし（複数回必要な場合あり）", "https://shinjuku-dental.jp/price"),
      t("whitening_home", 16_000, 16_000, "オパールエッセンスGO 10回分", "https://shinjuku-dental.jp/price"),
      t("ortho_aligner", 770_000, 880_000, "記載なし", "https://shinjuku-dental.jp/price", "非抜歯軽度〜抜歯で料金が変わる。検査料16,500円・診断料33,000円は別"),
    ],
  }),
  shinjuku({
    id: id(23), slug: "senga-dental-shinjuku-east", name: "千賀デンタルクリニック 新宿駅東口医院",
    address: "東京都新宿区新宿3-17-5 T&TⅢビル6階", walk_minutes: 1, website_url: "https://www.senga-dc-shinjuku-east.com/",
    features: ["access", "weekend"],
    catch_copy: "新宿駅東口から徒歩1分。年中無休で10時〜20時まで診療（ビル休館日を除く）",
    treatments: [
      t("whitening_office", 93_500, 93_500, "オフィス3回", "https://www.senga-dc-shinjuku-east.com/whitening/", "GLOW PLAN（オフィス3回）の料金"),
      t("whitening_home", 36_300, 36_300, "マウスピースとジェル6本", "https://www.senga-dc-shinjuku-east.com/whitening/", "DAILY PLANの料金"),
      t("whitening_dual", 60_500, 60_500, "オフィス1回とホームキット", "https://www.senga-dc-shinjuku-east.com/whitening/", "PERFECT PLANの料金"),
    ],
  }),
  shinjuku({
    id: id(24), slug: "tokyo-shinjuku-kyousei", name: "東京新宿矯正歯科",
    address: "東京都新宿区新宿3-19-4 MLJ新宿ビル5階", walk_minutes: 5, website_url: "https://www.oh-my-teeth.com/whitening/locations/shinjuku",
    features: ["price"],
    catch_copy: "新宿駅から徒歩5分。16分照射のオフィスホワイトニングを薬剤別に案内",
    treatments: [
      t("whitening_office", 4_980, 16_500, "1回16分照射", "https://www.oh-my-teeth.com/whitening/locations/shinjuku", "スタンダード4,980円・BOOST16,500円（2026年4月時点の税込価格と記載）"),
      t("whitening_home", 22_000, 22_000, "ジェル1か月分", "https://www.oh-my-teeth.com/whitening/locations/shinjuku", "ジェル1か月分11,000円と初回のマウスピース作製11,000円の合計"),
    ],
  }),
  shinjuku({
    id: id(25), slug: "shinjuku-white-clinic", name: "新宿ホワイトクリニック",
    address: "東京都新宿区新宿3-25-10 當山ビル7階", walk_minutes: 1, website_url: "https://shinjuku-wc.com/",
    features: ["price", "access"],
    catch_copy: "ホワイトニング中心の歯科医院。新宿駅東口から徒歩1分",
    treatments: [
      t("whitening_office", 8_800, 22_000, "1回約60分", "https://shinjuku-wc.com/menu/", "本数無制限。薬剤の濃度で料金が変わる"),
      t("whitening_home", 33_000, 33_000, "マウスピース上下とジェル4本", "https://shinjuku-wc.com/menu/"),
      t("whitening_dual", 43_400, 74_800, "オフィス2回とホーム（ジェル2本）", "https://shinjuku-wc.com/menu/", "薬剤で料金が変わる。下限は割引価格、上限は通常価格"),
    ],
  }),
  shinjuku({
    id: id(26), slug: "shinjuku-is-dental", name: "新宿I'S歯科・矯正歯科",
    address: "東京都新宿区新宿3-17-10 HULIC & New SHINJUKU 6階", walk_minutes: 3, website_url: "https://www.shinjukud-c.com/",
    features: ["access"],
    catch_copy: "新宿駅から徒歩3分。ホワイトニングとマウスピース・ワイヤー矯正の料金を公開",
    treatments: [
      t("whitening_office", 22_000, 88_000, "1回〜5回（1回3照射）", "https://www.shinjukud-c.com/price/", "1回22,000円・3回55,000円・5回88,000円"),
      t("whitening_home", 29_700, 29_700, "上下あごセット", "https://www.shinjukud-c.com/price/"),
      t("ortho_aligner", 660_000, 880_000, "記載なし", "https://www.shinjukud-c.com/price/", "インビザライン。検査・診断料33,000円・調整料5,500円/回は別"),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://www.shinjukud-c.com/price/", "全顎矯正。検査・診断料33,000円・調整料5,500円/月は別"),
      t("ortho_partial", 165_000, 440_000, "記載なし", "https://www.shinjukud-c.com/price/", "ワイヤー165,000円〜・マウスピース220,000円〜。検査・診断料33,000円・調整料5,500円は別"),
    ],
  }),
  shinjukuSendagaya1030({
    id: id(27), slug: "shinjuku-minamiguchi-mishima", name: "新宿駅南口歯科三島",
    address: "東京都渋谷区千駄ケ谷5-27-5 リンクスクエア新宿203", walk_minutes: 3, website_url: "https://www.mishima-shika-shinjuku.com/",
    features: ["access", "weekend"],
    catch_copy: "新宿駅新南口デッキ直結で徒歩3分。平日は20時半まで、土曜も診療",
    treatments: [
      t("whitening_office", 20_000, 30_000, "1回", "https://www.mishima-shika-shinjuku.com/whitening", "1回20,000〜30,000円"),
      t("whitening_home", 20_000, 20_000, "記載なし", "https://www.mishima-shika-shinjuku.com/whitening", "追加ジェルは1本1,980円"),
      t("whitening_dual", 70_000, 100_000, "記載なし", "https://www.mishima-shika-shinjuku.com/whitening"),
    ],
  }),
  shinjuku1030({
    id: id(28), slug: "od-shinjuku-dental", name: "OD新宿歯科・矯正歯科",
    address: "東京都新宿区新宿2-12-8 ACN新宿ビル3F", walk_minutes: 8, website_url: "https://od-shinjuku.com/",
    features: ["price"],
    catch_copy: "JR新宿駅から徒歩8分、新宿三丁目駅C8出口すぐ。ワイヤー・マウスピース矯正とホワイトニングの料金を公開",
    treatments: [
      t("whitening_office", 30_000, 30_000, "1回", "https://od-shinjuku.com/fee/", `1回目30,000円・2回目10,000円。${NO_TAX}`),
      t("whitening_home", 30_000, 30_000, "約2週間分（トレー2・シリンジ4本）", "https://od-shinjuku.com/fee/", NO_TAX),
      t("ortho_aligner", 460_000, 660_000, "記載なし", "https://od-shinjuku.com/fee/", "インビザライン両顎モデレート46万円〜コンプリヘンシブ（5年）66万円。検査料5万円・調整料4,000円/回は別"),
      t("ortho_wire", 300_000, 600_000, "記載なし", "https://od-shinjuku.com/fee/", "全体矯正は片顎30万円（上下で60万円）。診断検査料3万円・調整料4,000〜5,000円/回・保定装置1万円/個は別"),
      t("ortho_lingual", 500_000, 1_000_000, "記載なし", "https://od-shinjuku.com/fee/", "全体矯正は片顎50万円（上下で100万円）。診断検査料3万円・調整料6,000〜7,000円/回・保定装置1万円/個は別"),
      t("ortho_partial", 100_000, 200_000, "半年程度", "https://od-shinjuku.com/fee/", "表側10万円・裏側20万円。診断検査料3万円・調整料は別"),
    ],
  }),
  shinjuku1030({
    id: id(29), slug: "shinjuku-louvre-dental", name: "新宿ルーブル歯科・矯正歯科",
    address: "東京都新宿区新宿3-25-1 ヒューリック新宿ビル8階", walk_minutes: 1, website_url: "https://www.shinjuku-louvre-dental.com/",
    features: ["access", "weekend"],
    catch_copy: "新宿駅東口から徒歩1分。土日も18時まで診療（水曜・祝日休診）",
    treatments: [
      t("whitening_office", 33_000, 33_000, "記載なし", "https://www.shinjuku-louvre-dental.com/whitening/"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://www.shinjuku-louvre-dental.com/whitening/"),
      t("whitening_dual", 66_000, 66_000, "オフィスとホーム", "https://www.shinjuku-louvre-dental.com/whitening/"),
      t("ortho_aligner", 770_000, 880_000, "記載なし", "https://www.shinjuku-louvre-dental.com/clinic/cost.php", "インビザライン全体矯正（調整料なし）。精密検査33,000円は別"),
      t("ortho_wire", 660_000, 770_000, "記載なし", "https://www.shinjuku-louvre-dental.com/clinic/cost.php", "クリアブラケットとホワイトワイヤー。精密検査33,000円・調整料6,600円/回は別"),
      t("ortho_lingual", 990_000, 1_210_000, "記載なし", "https://www.shinjuku-louvre-dental.com/clinic/cost.php", "ハーフリンガル990,000円・フルリンガル1,210,000円。精密検査33,000円・調整料8,800〜11,000円/回は別"),
      t("ortho_partial", 110_000, 550_000, "記載なし", "https://www.shinjuku-louvre-dental.com/clinic/cost.php", "MTM。お口の状態で変わる。精密検査33,000円・調整料6,600円/回は別"),
    ],
  }),
  shinjuku1030({
    id: id(30), slug: "tokyo-bianco-shinjuku", name: "東京ビアンコ歯科・矯正歯科 新宿院",
    address: "東京都新宿区西新宿7-2-5 TH西新宿ビル7F", walk_minutes: 5, website_url: "https://kyouseishika-shinjuku.tokyo/",
    features: ["price"],
    catch_copy: "新宿駅西口から徒歩5分。矯正料金に検査料・調整料・リテーナーを含む料金表示",
    treatments: [
      t("ortho_aligner", 712_500, 900_000, "記載なし", "https://kyouseishika-shinjuku.tokyo/price", "インビザライン（非抜歯〜抜歯・PBMの有無で変わる）。検査料・調整料・リテーナー込み"),
      t("ortho_wire", 627_000, 783_750, "記載なし", "https://kyouseishika-shinjuku.tokyo/price", "白い目立たない表側矯正（非抜歯〜抜歯）。検査料・調整料・リテーナー込み"),
      t("ortho_lingual", 712_500, 807_500, "記載なし", "https://kyouseishika-shinjuku.tokyo/price", "ハーフリンガル712,500円〜・裏側（非抜歯）807,500円。裏側の抜歯矯正は公式サイトの表記が崩れているため載せていません。検査料・調整料・リテーナー込み"),
      t("ortho_partial", 275_000, 605_000, "記載なし", "https://kyouseishika-shinjuku.tokyo/price", "表側（片顎）275,000円〜裏側（上下）605,000円"),
    ],
  }),
  shinjuku1030({
    id: id(31), slug: "amour-dental-shinjuku", name: "アムール歯科 新宿",
    address: "東京都新宿区新宿3-37-11 安与ビル4F", walk_minutes: 1, website_url: "https://amour-d.com/",
    features: ["access"],
    catch_copy: "JR新宿駅東口改札から徒歩1分。マウスピース矯正の料金を公開",
    treatments: [
      t("ortho_aligner", 547_800, 547_800, "マウスピース48枚まで", "https://amour-d.com/price/", "精密検査33,000円・リテーナー16,500円は別"),
    ],
  }),
  shinjuku1030({
    id: id(32), slug: "shinjuku-swan-dental", name: "新宿スワン歯科・矯正歯科",
    address: "東京都新宿区西新宿1-13-8 朝日新宿ビル3F", walk_minutes: 2, website_url: "https://shinjuku-swan.com/",
    features: ["access", "weekend"],
    catch_copy: "新宿駅西口から徒歩2分。土曜も診療（日曜・祝日休診）",
    treatments: [
      t("whitening_office", 16_500, 16_500, "1回", "https://shinjuku-swan.com/price/", "公式サイトの表記は「1歯1回」"),
      t("whitening_home", 29_500, 29_500, "トレーとジェル6本", "https://shinjuku-swan.com/price/"),
      t("ortho_aligner", 330_000, 899_800, "記載なし", "https://shinjuku-swan.com/price/", "インビザライン エクスプレス〜コンプリヘンシブ。精密検査38,500円・調整料5,500円（発生する場合）・リテーナー88,000円は別"),
      t("ortho_wire", 715_000, 715_000, "記載なし", "https://shinjuku-swan.com/price/", "ワイヤー矯正Mild。精密検査38,500円・調整料5,500円（発生する場合）・リテーナー88,000円は別"),
      t("ortho_lingual", 1_300_200, 1_300_200, "記載なし", "https://shinjuku-swan.com/price/", "インコグニト。精密検査38,500円・調整料5,500円（発生する場合）・リテーナー88,000円は別"),
      t("ortho_partial", 178_200, 288_200, "記載なし", "https://shinjuku-swan.com/price/", "精密検査38,500円・リテーナー88,000円は別"),
    ],
  }),
  shinjuku1030({
    id: id(33), slug: "shinjuku-ekimae-bratt-dental", name: "新宿駅前ブラート歯科",
    address: "東京都新宿区新宿4-4-1 第1スカイビル1階", walk_minutes: 2, website_url: "https://www.shinjyuku-dental.com/",
    features: ["access", "weekend"],
    catch_copy: "JR新宿駅新南口から徒歩2分。土日も診療（水曜休診）",
    treatments: [
      t("whitening_office", 27_500, 44_000, "1回", "https://www.shinjyuku-dental.com/price/", "通常44,000円。平日10:00〜15:30の予約は27,500円"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://www.shinjyuku-dental.com/price/"),
      t("whitening_dual", 66_000, 66_000, "オフィスとホーム", "https://www.shinjyuku-dental.com/price/"),
      t("ortho_aligner", 990_000, 990_000, "記載なし", "https://www.shinjyuku-dental.com/price/", "インビザライン。精密検査27,500円は別。トータルフィーのため調整料はなし"),
      t("ortho_wire", 990_000, 990_000, "記載なし", "https://www.shinjyuku-dental.com/price/", "精密検査27,500円は別。トータルフィーのため調整料はなし"),
      t("ortho_lingual", 1_375_000, 1_375_000, "記載なし", "https://www.shinjyuku-dental.com/price/", "精密検査27,500円は別。トータルフィーのため調整料はなし"),
      t("ortho_partial", 165_000, 605_000, "記載なし", "https://www.shinjyuku-dental.com/price/", "精密検査27,500円は別"),
    ],
  }),
  shinjuku1030({
    id: id(34), slug: "shinjuku-nishiguchi-dental", name: "新宿西口歯科医院",
    address: "東京都新宿区西新宿2-1-1 新宿三井ビルディング4F", walk_minutes: 6, website_url: "https://ikashika.jp/",
    features: ["weekend"],
    catch_copy: "JR新宿駅から徒歩6分。土曜は19時、日曜は17時まで診療（祝日休診）",
    treatments: [
      t("whitening_office", 33_000, 33_000, "1回", "https://ikashika.jp/price/", "追加1回5,500円"),
      t("whitening_home", 33_000, 33_000, "ジェル6本付き", "https://ikashika.jp/price/"),
      t("whitening_dual", 55_000, 55_000, "オフィス3回とジェル6本", "https://ikashika.jp/price/", "オフィスの追加1回5,500円"),
      t("ortho_aligner", 440_000, 440_000, "記載なし", "https://ikashika.jp/price/", "前歯向けのインビザラインGo（両顎）"),
    ],
  }),
  shinjuku1030({
    id: id(35), slug: "tokiwa-orthodontic-shinjuku", name: "常盤矯正歯科医院",
    address: "東京都新宿区新宿4-3-22 安藤ビル5F", walk_minutes: 5, website_url: "https://tokiwaoc.com/",
    features: ["weekend"],
    catch_copy: "JR新宿駅南口から徒歩5分。土日も10時〜18時に診療",
    treatments: [
      t("whitening_home", 44_000, 44_000, "上下トレイと薬剤4本", "https://tokiwaoc.com/menu/", "追加薬剤は1パック6,600円"),
      t("ortho_aligner", 990_000, 1_100_000, "記載なし", "https://tokiwaoc.com/menu/", "精密検査44,000円・診断22,000円・調整料5,500円/回は別"),
      t("ortho_wire", 880_000, 990_000, "記載なし", "https://tokiwaoc.com/menu/", "公式サイト内に880,000円〜990,000円の記載があります。精密検査44,000円・診断22,000円・調整料5,500円/回は別"),
      t("ortho_lingual", 1_210_000, 1_650_000, "記載なし", "https://tokiwaoc.com/menu/", "上だけ1,210,000円・上下1,430,000〜1,650,000円。精密検査44,000円・診断22,000円・調整料6,600〜8,800円/回は別"),
      t("ortho_partial", 220_000, 440_000, "記載なし", "https://tokiwaoc.com/menu/", "精密検査33,000円・診断22,000円・調整料5,500円/回は別"),
    ],
  }),
  shinjuku1030({
    id: id(36), slug: "the-white-dental-shinjuku", name: "ザ・ホワイトデンタルクリニック新宿院",
    address: "東京都新宿区新宿3-33-10 新宿モリエールビル5階", walk_minutes: 5, website_url: "https://www.biyou-dental.com/sphone/shinjuku/",
    features: ["weekend"],
    catch_copy: "JR新宿駅東南口から徒歩5分。土日祝も10時〜19時に診療",
    treatments: [
      t("whitening_office", 132_000, 132_000, "記載なし", "https://www.biyou-dental.com/price.php"),
      t("whitening_home", 55_000, 55_000, "マウスピースとお薬", "https://www.biyou-dental.com/price.php"),
      t("ortho_aligner", 440_000, 880_000, "記載なし", "https://www.biyou-dental.com/price.php", "インビザラインGO440,000円・クリアコレクト550,000円・インビザライン880,000円"),
      t("ortho_partial", 330_000, 330_000, "記載なし", "https://www.biyou-dental.com/price.php", "MTM"),
    ],
  }),
  shinjuku1031({
    id: id(37), slug: "sbc-dental-shinjuku", name: "湘南美容歯科 新宿院",
    address: "東京都新宿区西新宿7-10-1 O-GUARD SHINJUKU 8F", walk_minutes: 5, website_url: "https://www.sbc-dental.com/clinic/shinjuku/",
    features: [],
    catch_copy: "JR新宿駅から徒歩5分。10時〜19時の予約制",
    treatments: [
      t("whitening_office", 19_800, 49_800, "1回〜3回", "https://www.sbc-dental.com/price/whitening.html", `1回19,800円・3回49,800円（モニター価格ではない通常価格）。${NO_TAX}`),
      t("whitening_home", 25_250, 25_250, "上下トレーとジェル2本", "https://www.sbc-dental.com/price/whitening.html", `追加ジェル1本3,030円。${NO_TAX}`),
    ],
  }),
  shinjuku1031({
    id: id(38), slug: "alesta-shinjuku-dental", name: "アレスタ新宿デンタルオフィス",
    address: "東京都新宿区西新宿7-10-3 第二雨宮ビル3F", walk_minutes: 5, website_url: "https://www.alesta-do.jp/",
    features: ["weekend"],
    catch_copy: "JR新宿駅から徒歩5分。土曜・祝日も診療（火・日、第2・第4水曜休診）",
    treatments: [
      t("whitening_office", 22_000, 88_000, "1回〜5回", "https://www.alesta-do.jp/price.html", "1回22,000円・3回55,000円・5回88,000円"),
      t("whitening_home", 27_500, 27_500, "記載なし", "https://www.alesta-do.jp/price.html"),
      t("whitening_dual", 60_500, 60_500, "オフィス2回とホーム", "https://www.alesta-do.jp/price.html"),
      t("ortho_aligner", 660_000, 825_000, "記載なし", "https://www.alesta-do.jp/price.html", "全顎（非抜歯〜抜歯）。精密検査22,000円・シミュレーション11,000円・リテーナー16,000円は別"),
      t("ortho_partial", 495_000, 495_000, "記載なし", "https://www.alesta-do.jp/price.html", "マウスピースの部分矯正。精密検査22,000円・シミュレーション11,000円は別"),
    ],
  }),
  shinjuku1031({
    id: id(39), slug: "shinjuku-orange-dental", name: "新宿オランジェ歯科・矯正歯科",
    address: "東京都新宿区新宿4-2-1 ライオンズマンション新宿御苑1F", walk_minutes: 5, website_url: "https://www.sdc-shinjuku.com/",
    features: ["weekend"],
    catch_copy: "JR新宿駅南口・東南口から徒歩5分。土日も診療（水曜・祝日休診）",
    treatments: [
      t("ortho_wire", 550_000, 1_000_000, "記載なし", "https://www.sdc-shinjuku.com/price", `難易度により増減。検査・診断料・調節料・リテーナー代を含む定額制。舌側やマウスピースを選ぶと200,000〜330,000円の加算。${NO_TAX}`),
      t("ortho_aligner", 220_000, 330_000, "記載なし", "https://www.sdc-shinjuku.com/price", `マウスピース型矯正（片顎）。${NO_TAX}`),
      t("ortho_partial", 150_000, 330_000, "記載なし", "https://www.sdc-shinjuku.com/price", `検査・診断料・調節料・リテーナー代を含む定額制。${NO_TAX}`),
    ],
  }),
  shinjuku1031({
    id: id(40), slug: "komori-kyousei-shinjuku", name: "小森矯正歯科",
    address: "東京都新宿区西新宿1-3-3 品川ステーションビル6F", walk_minutes: 3, website_url: "https://www.komori-kyoseisika.com/",
    features: ["weekend"],
    catch_copy: "新宿駅西口から徒歩3分。平日は20時まで、土日も診療",
    treatments: [
      t("ortho_wire", 320_000, 640_000, "記載なし", "https://www.komori-kyoseisika.com/charge/orthodontic.html", "メタル・クリアブラケット320,000円、クリアティ・デーモンブラケット640,000円。精密検査は無料、調整料はトータルフィーに含む"),
      t("ortho_lingual", 890_000, 1_440_000, "記載なし", "https://www.komori-kyoseisika.com/charge/orthodontic.html", "ハーフリンガル890,000円〜全部裏側（STb）1,440,000円。精密検査は無料、調整料はトータルフィーに含む"),
    ],
  }),
  ikebukuro1031({
    id: id(41), slug: "ikebukuro-kinoshita-dental", name: "池袋きのした歯科・矯正歯科",
    address: "東京都豊島区東池袋1-15-1 菱山ビル6階", walk_minutes: 3, website_url: "https://ikebukurokdc.com/",
    features: ["weekend"],
    catch_copy: "JR池袋駅東口から徒歩3分。日曜も診療（祝日休診）",
    treatments: [
      t("whitening_office", 16_500, 27_500, "記載なし", "https://ikebukurokdc.com/menu/medical02/", "ベストスマイル16,500円・プラチナ27,500円"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://ikebukurokdc.com/menu/medical02/"),
      t("ortho_aligner", 880_000, 880_000, "記載なし", "https://ikebukurokdc.com/price/", "マウスピースの全顎矯正。矯正検査・診断料33,000円・再診費用5,500円は別"),
      t("ortho_partial", 495_000, 495_000, "記載なし", "https://ikebukurokdc.com/price/", "マウスピースの部分矯正。矯正検査・診断料33,000円・再診費用5,500円は別"),
    ],
  }),
  ikebukuro1031({
    id: id(42), slug: "tokyo-ikebukuro-kyousei", name: "東京池袋矯正歯科",
    address: "東京都豊島区西池袋1-1-30 東武ホープセンター ノースゾーン B1F", walk_minutes: 1, website_url: "https://tokyo-ikebukuro-kyousei.com/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅直結。土日祝も10時〜19時に診療。マウスピース矯正の定額プラン",
    treatments: [
      t("ortho_aligner", 660_000, 880_000, "約6ヶ月（Pro・中央値）", "https://tokyo-ikebukuro-kyousei.com/price/", "Pro（上下24本）660,000円・インビザライン コンプリヘンシブ880,000円。診察・検査は無料。リテーナー（上下11,000円）は別"),
      t("ortho_partial", 150_000, 330_000, "約2〜4ヶ月（中央値）", "https://tokyo-ikebukuro-kyousei.com/price/", "前歯12本。Lite 150,000円（軽度のみ）・Basic 330,000円。リテーナー（上下11,000円）は別"),
    ],
  }),
  ikebukuro1031({
    id: id(43), slug: "natural-smile-dental-ikebukuro", name: "ナチュラルスマイルデンタルクリニック",
    address: "東京都豊島区南池袋1-17-13 ゴールデンプラザビル4F", walk_minutes: 1, website_url: "https://dental-esthetic.net/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅東口から徒歩1分。日曜・祝日も診療（水・土休診）",
    treatments: [
      t("ortho_aligner", 385_000, 385_000, "最長3年", "https://dental-esthetic.net/cost/", "片顎・両顎とも同額。精密検査5,000円・調整料1,000円/回は別"),
      t("ortho_wire", 418_000, 418_000, "記載なし", "https://dental-esthetic.net/cost/", "審美ブラケット（上下）。精密検査33,000円・調整料2,500円/回（土日祝は+1,000円）は別"),
      t("ortho_lingual", 649_000, 880_000, "記載なし", "https://dental-esthetic.net/cost/", "ハーフリンガル649,000円・裏側880,000円（上下）。精密検査33,000円・調整料3,500〜4,500円/回は別"),
    ],
  }),
  ikebukuro1031({
    id: id(44), slug: "ikebukuro-first-dental", name: "池袋ファースト歯科クリニック",
    address: "東京都豊島区南池袋1-17-3 前島ビル1F", walk_minutes: 1, website_url: "https://ikebukuro-first-dental.jp/",
    features: ["price", "access", "weekend"],
    catch_copy: "JR池袋駅から徒歩1分。土曜は午前診療（日曜・祝日休診）",
    treatments: [
      t("whitening_office", 10_560, 10_560, "1回", "https://ikebukuro-first-dental.jp/17777002838664", `ポリリン酸ホワイトニング。${NO_TAX}`),
    ],
  }),
  ikebukuro1031({
    id: id(45), slug: "metropolitan-dental-ikebukuro", name: "メトロポリタンデンタルクリニック",
    address: "東京都豊島区西池袋1-11-1 メトロポリタンプラザビル10階（ルミネ池袋10階）", walk_minutes: 1, website_url: "https://metropolitan-dc.com/",
    features: ["access", "weekend"],
    catch_copy: "JR池袋駅直結・西口から徒歩1分。平日21時まで、土日祝も診療",
    treatments: [
      t("whitening_office", 25_300, 25_300, "記載なし", "https://metropolitan-dc.com/menu/aesthe/"),
      t("whitening_home", 36_300, 36_300, "記載なし", "https://metropolitan-dc.com/menu/aesthe/"),
      t("whitening_dual", 58_300, 58_300, "記載なし", "https://metropolitan-dc.com/menu/aesthe/"),
      t("ortho_wire", 1_069_200, 1_465_200, "記載なし", "https://metropolitan-dc.com/menu/ortho/", "総額（相談料・精密検査料・装置料・調整料・保定料を含む）"),
      t("ortho_lingual", 1_322_200, 1_498_200, "記載なし", "https://metropolitan-dc.com/menu/ortho/", "総額。マウスピース型矯正は公式サイトの総額表記が崩れているため載せていません"),
    ],
  }),
  ikebukuro1031({
    id: id(46), slug: "ikebukuro-kyousei-clinic", name: "池袋矯正歯科クリニック",
    address: "東京都豊島区東池袋1-14-12 第二SSビル7階", walk_minutes: 3, website_url: "https://www.ikebukuro-c.com/",
    features: [],
    catch_copy: "池袋駅東口から徒歩3分。調整料なしの料金表示（水・日・祝休診）",
    treatments: [
      t("ortho_wire", 902_000, 957_000, "記載なし", "https://www.ikebukuro-c.com/cost.php", "公式サイトは税別表記のため、消費税10%を加えた額にしています（税別820,000円・870,000円）。精密検査33,000円（税別30,000円）は別、調整料はかからない"),
      t("ortho_lingual", 1_342_000, 1_342_000, "記載なし", "https://www.ikebukuro-c.com/cost.php", "税別1,220,000円に消費税10%を加えた額。精密検査33,000円（税別30,000円）は別、調整料はかからない"),
      t("ortho_aligner", 957_000, 957_000, "記載なし", "https://www.ikebukuro-c.com/cost.php", "税別870,000円に消費税10%を加えた額。精密検査33,000円（税別30,000円）は別、調整料はかからない"),
    ],
  }),
  ikebukuro1101({
    id: id(47), slug: "sato-dental-ikebukuro-higashiguchi", name: "さとうデンタルクリニック 池袋東口駅前院",
    address: "東京都豊島区南池袋1-26-6 The SH one 4F", walk_minutes: 1, website_url: "https://satodentalclinic-ikebukuro.jp/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅から徒歩1分。土日も診療",
    treatments: [
      t("whitening_office", 20_900, 50_600, "記載なし", "https://satodentalclinic-ikebukuro.jp/price", "公式サイトは税別表記のため、消費税10%を加えた額にしています（ポリリン酸プラチナ税別19,000円・プレミアム税別46,000円）"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://satodentalclinic-ikebukuro.jp/price", "スタートキット税別30,000円に消費税10%を加えた額"),
      t("ortho_aligner", 660_000, 1_100_000, "記載なし", "https://satodentalclinic-ikebukuro.jp/price", "インビザライン フル片顎 税別600,000円・上下 税別1,000,000円に消費税10%を加えた額。検査・診断料33,000円（税別30,000円）・保定装置は別"),
      t("ortho_partial", 165_000, 605_000, "記載なし", "https://satodentalclinic-ikebukuro.jp/price", "部分矯正 税別150,000〜550,000円に消費税10%を加えた額"),
      t("ortho_wire", 880_000, 968_000, "記載なし", "https://satodentalclinic-ikebukuro.jp/price", "セラミックブラケット（上下）税別800,000円・ホワイトワイヤー税別880,000円に消費税10%を加えた額。検査・診断料33,000円（税別30,000円）・調整料5,500円（税別5,000円）/回・保定装置は別"),
      t("ortho_lingual", 1_100_000, 1_320_000, "記載なし", "https://satodentalclinic-ikebukuro.jp/price", "ハーフリンガル税別1,000,000円・フルリンガル税別1,200,000円に消費税10%を加えた額。検査・診断料と調整料（税別6,000〜7,000円/回）は別"),
    ],
  }),
  ikebukuro1101({
    id: id(48), slug: "tsunori-shika-ikebukuro", name: "池袋駅東口つのり歯科",
    address: "東京都豊島区東池袋1-3-5 池袋伊藤ビル6階", walk_minutes: 1, website_url: "https://www.tsunori-shika.com/",
    features: ["price", "access", "weekend"],
    catch_copy: "池袋駅東口から徒歩1分。土曜も診療（日曜・祝日休診）",
    treatments: [
      t("whitening_office", 22_000, 22_000, "記載なし", "https://www.tsunori-shika.com/price/", NO_TAX),
      t("whitening_home", 16_500, 29_700, "記載なし", "https://www.tsunori-shika.com/price/", `片顎（ジェル2本付き）16,500円・両顎（ジェル4本付き）29,700円。${NO_TAX}`),
      t("ortho_aligner", 660_000, 660_000, "通院可能期間5年以内", "https://www.tsunori-shika.com/price/", `インビザライン（マウスピース枚数無制限）。精密検査・診断料22,000円・調整料3,300円/回・保定装置22,000円は別。${NO_TAX}`),
      t("ortho_partial", 170_000, 385_000, "記載なし", "https://www.tsunori-shika.com/price/", `インビザライン 計14枚まで170,000円・計28枚まで385,000円。精密検査・診断料22,000円・調整料3,300円/回・保定装置22,000円は別。${NO_TAX}`),
    ],
  }),
  ikebukuro1101({
    id: id(49), slug: "hanarabi-kyousei-ikebukuro", name: "池袋はならび矯正歯科・神谷",
    address: "東京都豊島区池袋2-7-5 ソラーレ3階", walk_minutes: 1, website_url: "https://www.kdc-ikebukuro.com/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅C6出口から徒歩1分。土日も診療（金・祝休診）",
    treatments: [
      t("ortho_aligner", 220_000, 1_210_000, "約2〜3ヶ月（i7）〜約2年半（フル）", "https://www.kdc-ikebukuro.com/medical-bills/invisalign.php", "公式サイトは「+税」表記のため、消費税10%を加えた額にしています（i7 20万円〜プラス110万円）。トータルフィー（診断・定期チェック・保定装置を含む）"),
      t("whitening_office", 33_000, 33_000, "通常3回セット", "https://www.kdc-ikebukuro.com/medical-bills/others.php", "ポリリンプラチナ 税別30,000円に消費税10%を加えた額"),
    ],
  }),
  ikebukuro1101({
    id: id(50), slug: "sealds-dental-nishiikebukuro", name: "シールズデンタルクリニック 西池袋院",
    address: "東京都豊島区西池袋2-34-8", walk_minutes: 6, website_url: "https://sealds-dental.com/",
    features: ["weekend"],
    catch_copy: "池袋駅（JR・メトロポリタン口）から徒歩6分。土日も診療",
    treatments: [
      t("whitening_office", 19_900, 25_400, "記載なし", "https://sealds-dental.com/fee/", `プロ（前歯12本）19,900円・プロプラス（全歯）25,400円。${NO_TAX}`),
      t("ortho_wire", 756_000, 861_000, "記載なし", "https://sealds-dental.com/fee/", `表側矯正。調整料5,500円/回は別。${NO_TAX}`),
      t("ortho_lingual", 1_029_000, 1_239_000, "記載なし", "https://sealds-dental.com/fee/", `ハーフリンガル1,029,000円・フルリンガル1,239,000円。調整料7,700〜11,000円/回は別。${NO_TAX}`),
    ],
  }),
  ikebukuro1101({
    id: id(51), slug: "diagate-ikebukuro-dental", name: "デンタルオフィスダイヤゲート池袋",
    address: "東京都豊島区南池袋1-16-15 ダイヤゲート池袋2F", walk_minutes: 5, website_url: "https://www.setaden.com/ikebukuro/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅東口から徒歩5分。土日も診療（祝日休診）",
    treatments: [
      t("whitening_office", 33_000, 55_000, "記載なし", "https://www.setaden.com/ikebukuro/price/", "1回目33,000円（2回目11,000円）・Tionオフィスホワイトニング55,000円"),
      t("whitening_home", 22_000, 33_000, "記載なし", "https://www.setaden.com/ikebukuro/price/", "片顎22,000円・上下33,000円"),
      t("whitening_dual", 55_000, 66_000, "記載なし", "https://www.setaden.com/ikebukuro/price/", "オフィス1回＋ホーム55,000円・ガムピーリング付き66,000円"),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://www.setaden.com/ikebukuro/price/", "相談料8,800円・調整料8,800円/回は別"),
      t("ortho_aligner", 660_000, 880_000, "記載なし", "https://www.setaden.com/ikebukuro/price/", "インビザライン ライト660,000円〜コンプリヘンシブ880,000円。調整料8,800円/回は別"),
      t("ortho_partial", 220_000, 440_000, "記載なし", "https://www.setaden.com/ikebukuro/price/", "ワイヤー部分矯正。調整料8,800円/回は別"),
    ],
  }),
  ikebukuro1101({
    id: id(52), slug: "ikebukuro-maruyama-kyousei", name: "池袋まるやま矯正歯科",
    address: "東京都豊島区南池袋3-15-10 桐生ビル2F", walk_minutes: 3, website_url: "https://87-ortho.com/",
    features: ["weekend"],
    catch_copy: "池袋駅から徒歩3分。土曜も診療",
    treatments: [
      t("ortho_wire", 977_570, 1_198_780, "記載なし", "https://87-ortho.com/price/", "表側矯正。精密検査55,000円・初診カウンセリング3,300円・保定観察6,600円/回は別。治療中の再診料・処置料とリテーナー作製料は含む"),
      t("ortho_aligner", 1_155_000, 1_398_100, "記載なし", "https://87-ortho.com/price/", "インビザライン。精密検査55,000円・初診カウンセリング3,300円・保定観察6,600円/回は別"),
      t("ortho_lingual", 1_510_960, 1_655_390, "記載なし", "https://87-ortho.com/price/", "ハーフリンガル（上顎裏側・下顎表側）。精密検査55,000円・初診カウンセリング3,300円は別"),
    ],
  }),
  ikebukuro1101({
    id: id(53), slug: "ikebukuro-dental-clinic", name: "池袋デンタルクリニック",
    address: "東京都豊島区西池袋1-16-10 第2三笠ビル4F", walk_minutes: 1, website_url: "https://www.ikebukurodc.com/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅から徒歩1分。土日祝も診療（水曜・第2・4日曜休診）",
    treatments: [
      t("whitening_office", 33_000, 39_800, "90分", "https://www.ikebukurodc.com/price/index.html", "上または下の前歯8本33,000円・前歯16本39,800円"),
      t("whitening_home", 39_800, 39_800, "約10日分", "https://www.ikebukurodc.com/price/index.html", "上下のスターターキット（マウスピース・ジェル2本）"),
    ],
  }),
  ikebukuro1101({
    id: id(54), slug: "lily-smile-dental-ikebukuro", name: "Lily Smile Dental Clinic",
    address: "東京都豊島区西池袋5-2-10 八勝堂ビル2F", walk_minutes: 1, website_url: "https://lilysmiledc.com/",
    features: ["access", "weekend"],
    catch_copy: "池袋駅西口C2出口から徒歩1分。日曜・祝日も診療",
    treatments: [
      t("whitening_office", 38_500, 38_500, "記載なし", "https://lilysmiledc.com/whitening/", "通常料金（キャンペーン価格は載せていません）"),
      t("whitening_home", 30_800, 30_800, "記載なし", "https://lilysmiledc.com/whitening/", "通常料金（キャンペーン価格は載せていません）"),
      t("whitening_dual", 66_000, 66_000, "記載なし", "https://lilysmiledc.com/whitening/", "通常料金（キャンペーン価格は載せていません）"),
    ],
  }),
  ikebukuro1101({
    id: id(55), slug: "ikebukuro-minnano-kyousei", name: "みんなの矯正歯科・こども歯科クリニック",
    address: "東京都豊島区池袋2-2-1 ウイックスビル9階", walk_minutes: 3, website_url: "https://www.ikebukuro-minnano.com/",
    features: ["price", "weekend"],
    catch_copy: "池袋駅西口C6出口から徒歩3分。土曜と第1・3日曜（矯正のみ）も診療",
    treatments: [
      t("ortho_aligner", 698_500, 727_000, "記載なし", "https://www.ikebukuro-minnano.com/price/", "インビザライン ラショナル698,500円（リテーナー55,000円を含む）・コンプリヘンシブ727,000円（13歳以上）"),
      t("ortho_partial", 385_000, 385_000, "記載なし", "https://www.ikebukuro-minnano.com/price/", "インビザライン部分治療 ライトパッケージ（13歳以上）"),
    ],
  }),
  ikebukuro1101({
    id: id(56), slug: "idogawa-dental-ikebukuro", name: "いどがわ歯科 池袋院",
    address: "東京都豊島区池袋2-18-2 セラミック安藤ビル1F", walk_minutes: 1, website_url: "https://www.idogawa-dental.com/",
    features: ["price", "access", "weekend"],
    catch_copy: "池袋駅西口C1出口から徒歩1分。土日は午前に診療",
    treatments: [
      t("whitening_office", 16_500, 16_500, "1回", "https://www.idogawa-dental.com/price/"),
      t("whitening_home", 20_000, 20_000, "薬剤8回分", "https://www.idogawa-dental.com/price/", "マウスピース作製と薬剤8回分を含む"),
    ],
  }),
  ikebukuro1102({
    id: id(57), slug: "ikebukuro-shika-kyousei-nishiikebukuro", name: "池袋歯科・矯正歯科",
    address: "東京都豊島区西池袋3-17-3", walk_minutes: 5, website_url: "https://dental-ikebukuro.com/",
    features: ["weekend"],
    catch_copy: "池袋駅西口から徒歩5分。土日も診療",
    treatments: [
      t("whitening_office", 55_000, 55_000, "記載なし", "https://dental-ikebukuro.com/price/", "前歯16本の料金。追加1歯3,300円"),
      t("whitening_home", 16_500, 33_000, "記載なし", "https://dental-ikebukuro.com/price/", "片顎16,500円・全顎33,000円"),
      t("whitening_dual", 77_000, 77_000, "記載なし", "https://dental-ikebukuro.com/price/"),
      t("ortho_aligner", 440_000, 990_000, "記載なし", "https://dental-ikebukuro.com/price/", "マウスピース矯正 ハーフ440,000円〜アドバンス990,000円。検査・診断料55,000円・調整料5,500円/回・リテーナー33,000円は別"),
      t("ortho_wire", 550_000, 770_000, "記載なし", "https://dental-ikebukuro.com/price/", `全顎の装置代（メタル550,000円・クリア660,000円・プレミアム770,000円）。検査・診断料33,000円・調整料5,500円/月・リテーナー55,000円は別。${NO_TAX}`),
      t("ortho_partial", 220_000, 220_000, "記載なし", "https://dental-ikebukuro.com/price/", `ワイヤー部分矯正の装置代220,000円〜。検査・診断料33,000円・調整料5,500円/月・リテーナー27,500円〜は別。${NO_TAX}`),
    ],
  }),
  ikebukuro1102({
    id: id(58), slug: "ozaki-kyousei-ikebukuro", name: "尾崎矯正歯科クリニック",
    address: "東京都豊島区東池袋1-14-10 ポプラビル10F", walk_minutes: 3, website_url: "https://s-ooc.com/",
    features: ["weekend"],
    catch_copy: "JR池袋駅東口から徒歩3分。土曜と第1日曜も診療",
    treatments: [
      t("ortho_wire", 1_045_000, 1_155_000, "記載なし", "https://s-ooc.com/cost/", "唇側（表側）矯正。検査料66,000円・調整観察料3,300〜6,600円/回・リテーナー38,500円/片顎は別"),
      t("ortho_lingual", 1_320_000, 1_650_000, "記載なし", "https://s-ooc.com/cost/", "ハーフリンガル1,320,000〜1,430,000円・舌側（上下）1,540,000〜1,650,000円。検査料66,000円・リテーナー38,500円/片顎は別"),
      t("ortho_aligner", 1_265_000, 1_375_000, "記載なし", "https://s-ooc.com/cost/", "マウスピース型矯正装置。検査料66,000円・リテーナー38,500円/片顎は別"),
      t("ortho_partial", 550_000, 1_045_000, "記載なし", "https://s-ooc.com/cost/", "検査料66,000円・リテーナー38,500円/片顎は別"),
    ],
  }),
  ikebukuro1102({
    id: id(59), slug: "ikebukuro-clear-kyousei", name: "池袋クリア矯正歯科",
    address: "東京都豊島区西池袋3-32-5 3F", walk_minutes: 5, website_url: "https://www.kyousei-ikebukuro.com/",
    features: ["weekend"],
    catch_copy: "池袋駅西口から徒歩5分。土日も診療（隔週・予約制）",
    treatments: [
      t("ortho_wire", 770_000, 770_000, "記載なし", "https://www.kyousei-ikebukuro.com/cost/", "マルチブラケット（両顎）。検査料33,000円・診断料33,000円・保定中の観察料3,000円/回は別"),
      t("ortho_lingual", 440_000, 880_000, "記載なし", "https://www.kyousei-ikebukuro.com/cost/", "片顎440,000円・上下顎880,000円。検査料33,000円・診断料33,000円・調整料10,000円/回は別"),
    ],
  }),
  ikebukuro1102({
    id: id(60), slug: "daimatsu-kyousei-ikebukuro", name: "大松矯正歯科クリニック",
    address: "東京都豊島区池袋2-13-2 金子園ビル3F", walk_minutes: 3, website_url: "https://4180.jp/",
    features: ["weekend"],
    catch_copy: "池袋駅から徒歩3分。土曜も診療（木・日・祝休診）",
    treatments: [
      t("ortho_wire", 825_000, 935_000, "6〜30ヶ月", "https://4180.jp/price/", "Ⅱ期 全体矯正（軽度825,000円〜重度935,000円・保定装置を含む）。検査料16,500円・診断料11,000円・処置（管理）料3,300〜5,500円/回は別。公式サイトの料金は2022年2月現在の記載"),
      t("ortho_aligner", 1_045_000, 1_265_000, "6〜30ヶ月", "https://4180.jp/price/", "インビザライン・スパーク。検査料16,500円・診断料11,000円・処置（管理）料3,300〜5,500円/回は別。公式サイトの料金は2022年2月現在の記載"),
    ],
  }),
  ebisu1102({
    id: id(61), slug: "ebisu-dental-clinic-tokyo", name: "恵比寿デンタルクリニック東京",
    address: "東京都渋谷区恵比寿1-10-8 トレベルノビル1F", walk_minutes: 1, website_url: "https://www.ebisu-shika.tokyo/",
    features: ["access", "weekend"],
    catch_copy: "JR恵比寿駅西口から徒歩1分。土日も診療（祝日休診）",
    treatments: [
      t("whitening_office", 35_200, 35_200, "2〜3回施術", "https://www.ebisu-shika.tokyo/price-list/"),
      t("whitening_home", 35_200, 35_200, "記載なし", "https://www.ebisu-shika.tokyo/price-list/", "上下顎・マウストレー製作込み"),
      t("whitening_dual", 60_500, 60_500, "記載なし", "https://www.ebisu-shika.tokyo/price-list/", "オフィス1〜2回とホームのセット"),
      t("ortho_wire", 770_000, 935_000, "記載なし", "https://www.ebisu-shika.tokyo/price-list/", "ワイヤー矯正770,000〜880,000円・審美的ワイヤー矯正825,000〜935,000円。検査・診断料33,000円・調節料5,500円/回・保定装置33,000円/片顎は別"),
      t("ortho_lingual", 1_210_000, 1_430_000, "記載なし", "https://www.ebisu-shika.tokyo/price-list/", "片顎1,210,000円・全顎1,430,000円。検査・診断料33,000円・調節料5,500円/回・保定装置33,000円/片顎は別"),
      t("ortho_aligner", 990_000, 1_210_000, "記載なし", "https://www.ebisu-shika.tokyo/price-list/", "インビザライン。検査・診断料33,000円・調節料5,500円/回（2〜3ヶ月に1度）・保定装置33,000円/片顎は別"),
    ],
  }),
  ebisu1102({
    id: id(62), slug: "dental-clinic-pure-ebisu", name: "デンタルクリニック ピュア恵比寿",
    address: "東京都渋谷区恵比寿1-7-13 只見ビル2F/5F", walk_minutes: 2, website_url: "https://www.dc-pure.com/ebisu",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅から徒歩2分。土日祝も診療",
    treatments: [
      t("whitening_office", 21_780, 21_780, "記載なし", "https://www.dc-pure.com/ebisu/service/whitening", "クリニックレーザーホワイトニング"),
      t("whitening_home", 21_780, 21_780, "記載なし", "https://www.dc-pure.com/ebisu/service/whitening", "ジェル4本・トレー付き"),
      t("ortho_wire", 602_800, 1_097_800, "記載なし", "https://dc-pure.com/price/", "クリアブラケット 片顎602,800円・全顎1,097,800円（全顎は保定装置込み）。矯正診断料11,000〜33,000円は別"),
      t("ortho_lingual", 904_200, 1_646_700, "記載なし", "https://dc-pure.com/price/", "片顎904,200円・上裏側＋下表側1,372,250円・全顎1,646,700円。矯正診断料11,000〜33,000円は別"),
      t("ortho_aligner", 437_800, 1_097_800, "記載なし", "https://dc-pure.com/price/", "インビザライン i7 437,800円〜コンプリヘンシブ1,097,800円（調整料・保定装置込み）。矯正診断料11,000〜33,000円は別"),
      t("ortho_partial", 55_000, 327_800, "記載なし", "https://dc-pure.com/price/", "MTM 55,000〜110,000円・ワイヤー部分矯正（5〜5）327,800円。矯正診断料は別"),
    ],
  }),
  ebisu1102({
    id: id(63), slug: "sato-dental-ebisu-honin", name: "さとうデンタルクリニック 恵比寿本院",
    address: "東京都渋谷区広尾1-16-2 VORT恵比寿Ⅱ 4F・5F・8F", walk_minutes: 3, website_url: "https://www.satodentalclinic-ebis.jp/",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅から徒歩3分。土日も診療（祝日休診）",
    treatments: [
      t("whitening_office", 20_900, 50_600, "記載なし", "https://www.satodentalclinic-ebis.jp/price/", "公式サイトは税抜表記のため、消費税10%を加えた額にしています（ポリリン酸プラチナ税抜19,000円・プレミアム税抜46,000円）"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://www.satodentalclinic-ebis.jp/price/", "スタートキット税抜30,000円に消費税10%を加えた額"),
      t("ortho_wire", 880_000, 968_000, "記載なし", "https://www.satodentalclinic-ebis.jp/price/", "セラミックブラケット（上下）税抜800,000円・ホワイトワイヤー税抜880,000円に消費税10%を加えた額。検査・診断料33,000円（税抜30,000円）・調整料5,500円（税抜5,000円）/回・保定装置は別"),
      t("ortho_lingual", 1_100_000, 1_320_000, "記載なし", "https://www.satodentalclinic-ebis.jp/price/", "ハーフリンガル税抜1,000,000円・フルリンガル税抜1,200,000円に消費税10%を加えた額。検査・診断料と調整料（税抜6,000〜7,000円/回）は別"),
      t("ortho_aligner", 660_000, 1_100_000, "記載なし", "https://www.satodentalclinic-ebis.jp/price/", "インビザライン Full 片顎 税抜600,000円・上下 税抜1,000,000円に消費税10%を加えた額。検査・診断料33,000円（税抜30,000円）・保定装置は別"),
      t("ortho_partial", 165_000, 605_000, "記載なし", "https://www.satodentalclinic-ebis.jp/price/", "部分矯正 税抜150,000〜550,000円に消費税10%を加えた額"),
    ],
  }),
  ebisu1102({
    id: id(64), slug: "cocoro-dental-ebisu", name: "ココロデンタル恵比寿",
    address: "東京都渋谷区恵比寿西1-9-7 グランベル恵比寿ビル WEST10F", walk_minutes: 1, website_url: "https://cocoro-dc.tokyo/",
    features: ["access", "weekend"],
    catch_copy: "JR恵比寿駅から徒歩1分。平日は21時まで、土曜も診療（木・日・祝休診）",
    treatments: [
      t("whitening_office", 35_200, 35_200, "2クール", "https://cocoro-dc.tokyo/price"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://cocoro-dc.tokyo/price", "上下セット・ジェル4本込み"),
      t("whitening_dual", 58_200, 58_200, "記載なし", "https://cocoro-dc.tokyo/price", "オフィスホワイトニング＋ホームホワイトニング"),
      t("ortho_aligner", 275_000, 850_000, "記載なし", "https://cocoro-dc.tokyo/price", "シュアスマイル275,000〜550,000円・インビザライン330,000〜850,000円。相談・精密検査・診断は無料。調整料・保定装置の記載なし"),
    ],
  }),
  ebisu1102({
    id: id(65), slug: "kameda-shika-ebisu", name: "かめだ歯科クリニック",
    address: "東京都渋谷区恵比寿南1-2-11 フォーシーズン恵比寿ビル6F", walk_minutes: 3, website_url: "https://kameda-shika.net/",
    features: ["access", "weekend"],
    catch_copy: "JR恵比寿駅西口から徒歩3分。土曜も診療（日・祝休診）",
    treatments: [
      t("whitening_office", 27_500, 60_500, "1〜3回コース", "https://kameda-shika.net/price/", "1回コース27,500円・2回コース44,000円・3回コース60,500円"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://kameda-shika.net/price/", "上下"),
      t("ortho_wire", 825_000, 825_000, "記載なし", "https://kameda-shika.net/price/", "唇側矯正・セラミック。基本料金にカウンセリング・検査・診断・装置費を含む。調整料4,400円/回は別"),
      t("ortho_lingual", 1_100_000, 1_320_000, "記載なし", "https://kameda-shika.net/price/", "上顎裏・下顎表1,100,000円・上下とも裏側1,320,000円（検査・診断・装置費を含む）。調整料5,500円/回は別"),
      t("ortho_aligner", 880_000, 880_000, "記載なし", "https://kameda-shika.net/price/", "インビザライン。調整料3,300円/回は別"),
    ],
  }),
  ebisu1102({
    id: id(66), slug: "ebisu-hiroo-shika", name: "恵比寿・広尾歯科",
    address: "東京都渋谷区広尾1-11-5 朝日広尾マンション1F204号", walk_minutes: 7, website_url: "https://www.ebisu-hiroo-shika.com/",
    features: ["weekend"],
    catch_copy: "恵比寿駅・広尾駅から徒歩7分。日曜・祝日も診療（火・土休診）",
    treatments: [
      t("whitening_office", 15_400, 22_000, "1回（薬剤3回塗布）", "https://www.ebisu-hiroo-shika.com/pricelist", "上下3-3 15,400円・上下5-5 22,000円"),
      t("whitening_home", 13_200, 15_400, "記載なし", "https://www.ebisu-hiroo-shika.com/pricelist", "ホームホワイトニングキット プラチナ13,200円・通常15,400円"),
      t("ortho_wire", 924_000, 924_000, "記載なし", "https://www.ebisu-hiroo-shika.com/pricelist", "セラミックブラケット。矯正事前検査46,200円・調整料6,050円/回・リテーナー30,800円/片顎は別"),
      t("ortho_aligner", 1_270_500, 1_617_000, "記載なし", "https://www.ebisu-hiroo-shika.com/pricelist", "インビザライン基本治療費（装置代・調整料を含む）1,270,500円〜難易度加算3 1,617,000円。矯正事前検査46,200円・リテーナーは別"),
    ],
  }),
  ebisu1103({
    id: id(67), slug: "river-clinic-dental-ebisu", name: "RIVER CLINIC DENTAL 恵比寿",
    address: "東京都渋谷区恵比寿西1-7-4 5F", walk_minutes: 1, website_url: "https://river-clinic-dental.com/",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅から徒歩1分。土日・祝日も診療（月曜・隔週日曜休診）",
    treatments: [
      t("whitening_office", 21_800, 43_800, "1回", "https://river-clinic-dental.com/price/", "スタンダード21,800円・アドバンス32,800円・アペックス43,800円（各1回）。3回コースは59,840〜121,500円"),
      t("whitening_home", 32_800, 32_800, "記載なし", "https://river-clinic-dental.com/price/", "マウスピース＋ジェル4本"),
      t("whitening_dual", 65_800, 109_800, "オフィス2回＋ホーム", "https://river-clinic-dental.com/price/"),
      t("ortho_aligner", 330_000, 660_000, "記載なし", "https://river-clinic-dental.com/price/", "インビザライン エクスプレス〜フル。検査代33,000円・保定装置32,780円は別"),
      t("ortho_wire", 605_000, 660_000, "記載なし", "https://river-clinic-dental.com/price/", "全顎・表側（非抜歯605,000円・抜歯660,000円）。検査代33,000円・調整料5,500円/月・保定装置32,780円は別"),
      t("ortho_lingual", 770_000, 825_000, "記載なし", "https://river-clinic-dental.com/price/", "ハーフリンガル全顎（非抜歯770,000円・抜歯825,000円）。検査代33,000円・調整料5,500円/月・保定装置32,780円は別"),
      t("ortho_partial", 275_000, 547_800, "記載なし", "https://river-clinic-dental.com/price/", "前歯部分矯正（表側275,000〜440,000円・裏側上385,000円・ハーフリンガル547,800円）。検査代33,000円・調整料・保定装置は別"),
    ],
  }),
  ebisu1103({
    id: id(68), slug: "ebisu-is-shika-kyousei", name: "恵比寿I's歯科・矯正歯科",
    address: "東京都渋谷区恵比寿西1-10-10 若葉西ビル3F", walk_minutes: 2, website_url: "https://www.ebisudc.com/",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅西口から徒歩2分。土日も診療（木・祝休診）",
    treatments: [
      t("whitening_office", 22_000, 88_000, "1〜5回", "https://www.ebisudc.com/price/", "1回22,000円・3回55,000円・5回88,000円"),
      t("whitening_home", 29_700, 29_700, "記載なし", "https://www.ebisudc.com/price/", "上下トレー＋ジェル4本"),
      t("ortho_aligner", 660_000, 880_000, "記載なし", "https://www.ebisudc.com/price/", "インビザライン。検査・診断費33,000円・調整料5,500円/月は別"),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://www.ebisudc.com/price/", "全顎矯正。白いブラケット・白いワイヤーは各+44,000円。検査・診断費33,000円・調整料5,500円/月は別"),
      t("ortho_partial", 165_000, 440_000, "記載なし", "https://www.ebisudc.com/price/", "ワイヤー部分矯正165,000〜440,000円・マウスピース部分矯正220,000〜440,000円。検査・診断費33,000円・調整料5,500円/月は別"),
    ],
  }),
  ebisu1103({
    id: id(69), slug: "ebisu-kyousei-shika", name: "えびす矯正歯科",
    address: "東京都渋谷区恵比寿南2-1-12 サトウビル3F", walk_minutes: 2, website_url: "https://ebisu-japan.com/",
    features: ["access"],
    catch_copy: "JR恵比寿駅西口から徒歩2分。土曜も診療（木・日・祝休診）",
    treatments: [
      t("whitening_office", 27_500, 27_500, "1回（60分）", "https://ebisu-japan.com/price_1.html", `${NO_TAX}。3回66,000円・5回96,000円のコースあり`),
      t("whitening_home", 47_300, 47_300, "記載なし", "https://ebisu-japan.com/price_1.html", NO_TAX),
      t("whitening_dual", 66_000, 66_000, "記載なし", "https://ebisu-japan.com/price_1.html", NO_TAX),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://ebisu-japan.com/price_1.html", "成人の矯正基本料（メタル装置0円、白いセラミック装置は片顎+55,000円）。料金表に「消費税込」と「消費税別途」の両方の記載があるため記載額のまま。精密検査料33,000円・調整料5,500円/月・保定管理料55,000円は別"),
      t("ortho_lingual", 1_430_000, 1_430_000, "記載なし", "https://ebisu-japan.com/price_1.html", "矯正基本料880,000円＋裏側装置（上下）550,000円。料金表に「消費税込」と「消費税別途」の両方の記載があるため記載額のまま。精密検査料・調整料・保定管理料は別"),
      t("ortho_aligner", 660_000, 880_000, "記載なし", "https://ebisu-japan.com/price_1.html", "インビザライン ライト660,000円〜包括880,000円。料金表に「消費税込」と「消費税別途」の両方の記載があるため記載額のまま。精密検査料33,000円・調整料・保定管理料は別"),
      t("ortho_partial", 110_000, 550_000, "記載なし", "https://ebisu-japan.com/price_1.html", "部分矯正の基本料（前歯2本110,000円〜片顎550,000円、税込と記載）。白い装置・裏側装置は別料金"),
    ],
  }),
  ebisu1103({
    id: id(70), slug: "toyomaki-kyousei-shika", name: "とよまき矯正歯科",
    address: "東京都渋谷区恵比寿4-3-1 3F", walk_minutes: 1, website_url: "https://www.toyo-ddc.com/",
    features: ["access"],
    catch_copy: "JR恵比寿駅から徒歩1分。土曜も診療",
    treatments: [
      t("ortho_wire", 840_400, 994_400, "記載なし", "https://www.toyo-ddc.com/flow/", "透明の装置（上下・表側）。公式サイトは税別表記のため、消費税10%を加えた額にしています（税別764,000〜904,000円）。精密検査料29,700円（税別27,000円）は別。調整料・保定管理料は治療費に含む"),
      t("ortho_lingual", 1_097_800, 1_686_300, "記載なし", "https://www.toyo-ddc.com/flow/", "ハーフリンガル税別998,000〜1,283,000円・上下裏側税別1,128,000〜1,533,000円に消費税10%を加えた額。精密検査料は別。調整料・保定管理料は治療費に含む"),
      t("ortho_aligner", 840_400, 994_400, "記載なし", "https://www.toyo-ddc.com/flow/", "インビザライン税別764,000〜904,000円に消費税10%を加えた額。精密検査料は別。調整料・保定管理料は治療費に含む"),
      t("ortho_partial", 253_000, 385_000, "記載なし", "https://www.toyo-ddc.com/flow/", "片顎の部分矯正（表側税別230,000円・マウスピース税別255,000円・裏側税別350,000円）に消費税10%を加えた額"),
    ],
  }),
  ebisu1103({
    id: id(71), slug: "ebisu-est-kyousei", name: "恵比寿エスト矯正歯科",
    address: "東京都渋谷区恵比寿1-20-27 エストエビス2F", walk_minutes: 2, website_url: "https://ebis888.com/",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅東口から徒歩2分。土日も診療（月・祝休診）",
    treatments: [
      t("ortho_wire", 385_000, 462_000, "記載なし", "https://ebis888.com/hiyou/", `${NO_TAX}。片顎の料金（メタル385,000円・セラミック/デーモン462,000円）。検査料33,000円・診断料5,500円・調整料5,500円/月・リテーナー（上下）33,000円は別`),
      t("ortho_lingual", 660_000, 660_000, "記載なし", "https://ebis888.com/hiyou/", `${NO_TAX}。片顎の料金。検査料33,000円・診断料5,500円・調整料5,500円/月・リテーナーは別`),
      t("ortho_aligner", 924_000, 924_000, "記載なし", "https://ebis888.com/hiyou/", `${NO_TAX}。インビザライン（両顎）。検査料33,000円・診断料5,500円・調整料5,500円/月・リテーナーは別`),
    ],
  }),
  ebisu1103({
    id: id(72), slug: "ebisu-masuda-kyousei", name: "恵比寿ますだ矯正歯科",
    address: "東京都渋谷区恵比寿1-11-3 アキックスエビスビル4F", walk_minutes: 1, website_url: "https://www.masuda-kyousei.com/",
    features: ["access", "weekend"],
    catch_copy: "JR恵比寿駅東口から徒歩1分。21時まで診療",
    treatments: [
      t("whitening_home", 33_000, 33_000, "記載なし", "https://www.masuda-kyousei.com/price-list/", "上下のホーム用マウスピース"),
      t("ortho_wire", 990_000, 1_045_000, "記載なし", "https://www.masuda-kyousei.com/price-list/", "表側セラミックブラケット（シルバーワイヤー990,000円・ホワイトワイヤー1,045,000円）。毎月の調整料を含む。相談料2,200円・検査料33,000円・診断料5,500円は別"),
      t("ortho_lingual", 1_309_000, 1_474_000, "記載なし", "https://www.masuda-kyousei.com/price-list/", "ハーフリンガル1,309,000円・上下裏側1,474,000円。毎月の調整料を含む。相談料・検査料33,000円・診断料5,500円は別"),
      t("ortho_aligner", 1_309_000, 1_309_000, "記載なし", "https://www.masuda-kyousei.com/price-list/", "インビザライン。毎月の調整料を含む。相談料・検査料33,000円・診断料5,500円は別"),
    ],
  }),
  ebisu1103({
    id: id(73), slug: "makino-shika-kyousei-ebisu", name: "牧野歯科・矯正歯科",
    address: "東京都渋谷区恵比寿1-9-5 恵比寿STビル4F", walk_minutes: 1, website_url: "https://mk-dental.jp/",
    features: ["access"],
    catch_copy: "JR恵比寿駅東口から徒歩1分（水・祝休診）",
    treatments: [
      t("whitening_office", 33_000, 59_400, "1〜2回", "https://mk-dental.jp/price-general/", "1回33,000円・2回59,400円"),
      t("whitening_home", 38_500, 38_500, "記載なし", "https://mk-dental.jp/price-general/"),
      t("whitening_dual", 71_500, 71_500, "記載なし", "https://mk-dental.jp/price-general/"),
      t("ortho_wire", 990_000, 1_210_000, "12〜24ヵ月の目安", "https://mk-dental.jp/price-orthodontic/", "審美ブラケット（上下表側）。通院ごとの再診料がかからないトータルフィー。検査・診断料33,000円は別"),
      t("ortho_lingual", 1_100_000, 1_540_000, "12〜24ヵ月の目安", "https://mk-dental.jp/price-orthodontic/", "ハーフリンガル1,100,000〜1,320,000円・上下裏側1,210,000〜1,540,000円。検査・診断料33,000円は別"),
      t("ortho_aligner", 1_210_000, 1_210_000, "記載なし", "https://mk-dental.jp/price-orthodontic/", "インビザライン フル。検査・診断料33,000円は別"),
      t("ortho_partial", 330_000, 990_000, "記載なし", "https://mk-dental.jp/price-orthodontic/", "表側330,000〜660,000円・インビザライン ライト440,000〜990,000円・裏側660,000〜990,000円。検査・診断料33,000円は別"),
    ],
  }),
  ebisu1103({
    id: id(74), slug: "ebisu-mika-shika", name: "恵比寿ミカ歯科クリニック",
    address: "東京都渋谷区恵比寿1-22-23 ヴェラハイツ恵比寿104", walk_minutes: 3, website_url: "https://ebisu-smile.jp/",
    features: ["access"],
    catch_copy: "JR恵比寿駅東口から徒歩3分（木・日・祝休診）",
    treatments: [
      t("whitening_office", 18_700, 18_700, "1回（照射3回）", "https://ebisu-smile.jp/price/"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://ebisu-smile.jp/price/", "トレーの料金。ジェルは1本3,300円で別"),
      t("ortho_aligner", 220_000, 825_000, "記載なし", "https://ebisu-smile.jp/price/", "インビザライン・アソアライナー。資料採取55,000円・調整料6,600円/月・リテーナー55,000円・保定観察料4,400円/回は別"),
      t("ortho_wire", 550_000, 550_000, "記載なし", "https://ebisu-smile.jp/price/", "表側ブラケット。資料採取55,000円・調整料6,600円/月・リテーナー55,000円・保定観察料4,400円/回は別"),
      t("ortho_lingual", 825_000, 825_000, "記載なし", "https://ebisu-smile.jp/price/", "裏側ブラケット。資料採取55,000円・調整料6,600円/月・リテーナー55,000円・保定観察料4,400円/回は別"),
    ],
  }),
  ebisu1103({
    id: id(75), slug: "anti-aging-dental-ebisu", name: "アンチエイジングデンタルクリニック恵比寿",
    address: "東京都渋谷区恵比寿西1-4-1 VANDAビル2F", walk_minutes: 2, website_url: "https://a-a-d-c.com/",
    features: ["access"],
    catch_copy: "JR恵比寿駅西口から徒歩2分（日・祝休診）",
    treatments: [
      t("whitening_office", 13_200, 44_000, "1回", "https://a-a-d-c.com/price", "ホワイトニング1回13,200円・スーパーホワイトニング39,600円・クリアホワイト44,000円。3回のパーフェクトコース95,040円"),
      t("ortho_aligner", 385_000, 1_100_000, "記載なし", "https://a-a-d-c.com/price", "インビザライン（調整料・装置装着料・追加治療を含むトータルフィー）。矯正精密検査・診断料33,000円は別"),
      t("ortho_wire", 880_000, 990_000, "記載なし", "https://a-a-d-c.com/price", "表側ワイヤー上下全体。矯正精密検査・診断料33,000円・調整料5,500円・保定装置22,000円/片顎は別"),
      t("ortho_partial", 275_000, 440_000, "記載なし", "https://a-a-d-c.com/price", "前歯の部分矯正（片顎・表側275,000〜440,000円・裏側440,000円）。矯正精密検査・診断料33,000円は別"),
    ],
  }),
  ebisu1103({
    id: id(76), slug: "amelie-shika-kyousei-ebisu", name: "アメリ歯科・矯正歯科 恵比寿",
    address: "東京都渋谷区恵比寿1-6-4 ミレニエ恵比寿1F", walk_minutes: 2, website_url: "https://www.amelie-ebisu.com/",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅西口から徒歩2分。土日も診療（火・祝休診）",
    treatments: [
      t("ortho_wire", 800_000, 800_000, "記載なし", "https://www.amelie-ebisu.com/price.html", `${NO_TAX}。精密検査・分析料35,000円・調整料3,000〜7,000円/回は別`),
      t("ortho_lingual", 1_200_000, 1_200_000, "記載なし", "https://www.amelie-ebisu.com/price.html", `${NO_TAX}。精密検査・分析料35,000円・調整料3,000〜7,000円/回は別`),
      t("ortho_aligner", 900_000, 900_000, "記載なし", "https://www.amelie-ebisu.com/price.html", `${NO_TAX}。インビザライン。精密検査・分析料35,000円・調整料3,000〜7,000円/回は別`),
      t("ortho_partial", 165_000, 440_000, "記載なし", "https://www.amelie-ebisu.com/price.html", "公式サイトは税抜表記のため、消費税10%を加えた額にしています（ワイヤー税抜150,000〜350,000円・マウスピース税抜200,000〜400,000円）"),
    ],
  }),
  ebisu1104({
    id: id(77), slug: "takara-dental-ebisu", name: "タカラデンタルクリニック",
    address: "東京都渋谷区恵比寿4-20-3 恵比寿ガーデンプレイスYGPタワー4F", walk_minutes: 5, website_url: "https://takara-dental.com/",
    features: ["weekend"],
    catch_copy: "JR恵比寿駅東口からスカイウォーク経由で徒歩5分。土曜も診療（日・祝休診）",
    treatments: [
      t("ortho_wire", 880_000, 1_320_000, "記載なし", "https://takara-dental.com/price/", "全顎治療の基本施術料・装置料（片顎440,000〜660,000円）。裏側・偏位は220,000〜440,000円加算。検査・診断料35,200円・調整料7,700円/月・保定装置66,000円は別"),
      t("ortho_aligner", 220_000, 440_000, "記載なし", "https://takara-dental.com/price/", "料金表の「マウスピース矯正、MTM」の額。検査・診断料35,200円・調整料7,700円/月は別"),
    ],
  }),
  ebisu1104({
    id: id(78), slug: "daikanyama-kyousei-shika", name: "代官山矯正歯科",
    address: "東京都渋谷区恵比寿西1-30-14 エコー代官山2F", walk_minutes: 4, website_url: "https://www.e-egao.jp/",
    features: ["access", "weekend"],
    catch_copy: "JR恵比寿駅から徒歩4分。土曜も診療（木・日休診、月1回日曜診療）",
    treatments: [
      t("ortho_wire", 990_000, 1_023_000, "記載なし", "https://www.e-egao.jp/price/", "表側の目立たない装置990,000円・デイモンクリア装置1,023,000円（税別900,000〜930,000円）。精密検査・診断料44,000円・保定管理料66,000円は別。月々の調整料なし"),
      t("ortho_aligner", 1_144_000, 1_144_000, "記載なし", "https://www.e-egao.jp/price/", "インビザラインまたはスパーク（税別1,040,000円）。精密検査・診断料44,000円・保定管理料66,000円は別。月々の調整料なし"),
    ],
  }),
  harajuku1104({
    id: id(79), slug: "harajuku-acqua-shika", name: "原宿アクア歯科 神宮前",
    address: "東京都渋谷区神宮前1-20-12 原宿フォース2F", walk_minutes: 2, website_url: "https://harajukuacqua.com/",
    features: ["access"],
    catch_copy: "JR原宿駅竹下口から徒歩2分",
    treatments: [
      t("ortho_wire", 880_000, 1_320_000, "記載なし", "https://harajukuacqua.com/price.html", "成人矯正（表側）。検査・診断22,000〜44,000円・診察料5,500円は別。動的治療後の保定装置は治療費に含む"),
      t("ortho_lingual", 1_210_000, 1_650_000, "記載なし", "https://harajukuacqua.com/price.html", "成人矯正（裏側）。検査・診断22,000〜44,000円・診察料5,500円は別"),
      t("ortho_aligner", 330_000, 660_000, "記載なし", "https://harajukuacqua.com/price.html", "検査・診断22,000〜44,000円・診察料5,500円は別"),
      t("ortho_partial", 330_000, 660_000, "記載なし", "https://harajukuacqua.com/price.html", "検査・診断22,000〜44,000円・診察料5,500円は別"),
    ],
  }),
  harajuku1104({
    id: id(80), slug: "k-braces-harajuku", name: "K Braces矯正歯科 原宿駅前",
    address: "東京都渋谷区神宮前1-14-24 原宿TWビル5F", walk_minutes: 1, website_url: "https://kawaii-kyousei.com/",
    features: ["access", "weekend"],
    catch_copy: "JR原宿駅から徒歩1分。土曜・祝日も診療（木・日休診）",
    treatments: [
      t("ortho_wire", 990_000, 990_000, "記載なし", "https://kawaii-kyousei.com/price.php", "表側矯正（全体）。精密検査料55,000円・調整料5,000円/回は別。保定装置は治療費に含む"),
      t("ortho_lingual", 1_210_000, 1_210_000, "記載なし", "https://kawaii-kyousei.com/price.php", "裏側全体矯正。精密検査料55,000円は別。保定装置は治療費に含む"),
      t("ortho_aligner", 1_100_000, 1_100_000, "記載なし", "https://kawaii-kyousei.com/price.php", "マウスピース矯正（全体）。精密検査料55,000円は別。保定装置は治療費に含む"),
      t("ortho_partial", 605_000, 605_000, "記載なし", "https://kawaii-kyousei.com/price.php", "表側部分矯正。精密検査料55,000円・調整料5,000円/回は別"),
    ],
  }),
  harajuku1104({
    id: id(81), slug: "omotesando-dental-office", name: "表参道デンタルオフィス",
    address: "東京都渋谷区神宮前3-22-1 神宮前スクエア201", walk_minutes: 5, website_url: "https://omotesando-dental.com/",
    features: [],
    catch_copy: "JR原宿駅から徒歩約5分",
    treatments: [
      t("whitening_office", 33_000, 33_000, "記載なし", "https://omotesando-dental.com/price/", "公式サイトは税抜表記のため、消費税10%を加えた額にしています（税抜30,000円）"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://omotesando-dental.com/price/", "公式サイトは税抜表記のため、消費税10%を加えた額にしています（税抜30,000円）"),
      t("ortho_wire", 770_000, 1_100_000, "記載なし", "https://omotesando-dental.com/price/", "全顎矯正。公式サイトは税抜表記のため、消費税10%を加えた額にしています（税抜700,000〜1,000,000円）。調整料5,500円は別。検査・診断料は記載なし"),
      t("ortho_aligner", 660_000, 1_100_000, "記載なし", "https://omotesando-dental.com/price/", "公式サイトは税抜表記のため、消費税10%を加えた額にしています（税抜600,000〜1,000,000円）。調整料5,500円は別"),
      t("ortho_partial", 88_000, 330_000, "記載なし", "https://omotesando-dental.com/price/", "公式サイトは税抜表記のため、消費税10%を加えた額にしています（税抜80,000〜300,000円）。調整料5,500円は別"),
    ],
  }),
  harajuku1104({
    id: id(82), slug: "harajuku-gaien-kyousei", name: "原宿外苑矯正歯科",
    address: "東京都渋谷区千駄ヶ谷3-63-2 MJ原宿ビル4F", walk_minutes: 2, website_url: "https://s-hgo.com/",
    features: ["access", "weekend"],
    catch_copy: "原宿駅から徒歩2分。水・金・土曜に診療",
    treatments: [
      t("ortho_wire", 1_045_000, 1_155_000, "記載なし", "https://s-hgo.com/cost/", "唇側（表側）。検査66,000円（診断込み）・調整費・観察費3,300〜6,600円・リテーナー38,500円/片顎は別"),
      t("ortho_lingual", 1_540_000, 1_650_000, "記載なし", "https://s-hgo.com/cost/", "舌側（上下）。検査66,000円・リテーナー38,500円/片顎は別"),
      t("ortho_aligner", 1_265_000, 1_375_000, "記載なし", "https://s-hgo.com/cost/", "検査66,000円・リテーナー38,500円/片顎は別"),
      t("ortho_partial", 550_000, 1_045_000, "記載なし", "https://s-hgo.com/cost/", "状況により異なる。検査66,000円・リテーナー38,500円/片顎は別"),
    ],
  }),
  harajuku1104({
    id: id(83), slug: "jingumae-kyousei-shika", name: "神宮前矯正歯科",
    address: "東京都渋谷区神宮前3-23-3 トリニティビル8F", walk_minutes: 4, website_url: "https://yoiha.jp/",
    features: ["access", "weekend"],
    catch_copy: "JR原宿駅から徒歩4分。土日・祝日も診療",
    treatments: [
      t("ortho_lingual", 1_210_000, 1_430_000, "記載なし", "https://yoiha.jp/price/", "上顎舌側・下顎唇側1,210,000円〜、上下顎舌側1,430,000円〜。検査・診断料55,000円・調整料6,600〜12,100円・保定観察料5,500円は別"),
    ],
  }),
  harajuku1104({
    id: id(84), slug: "harajuku-dental-clinic", name: "原宿デンタルクリニック",
    address: "東京都渋谷区神宮前6-29-3 原宿KYビル7F", walk_minutes: 4, website_url: "https://www.harajuku-dental.jp/",
    features: ["access"],
    catch_copy: "JR原宿駅から徒歩4分（土・日・祝休診）",
    treatments: [
      t("whitening_office", 30_250, 30_250, "1回（上下20歯）", "https://www.harajuku-dental.jp/whitening.html", "1か月以内の2回目は18,150円"),
      t("whitening_home", 24_200, 24_200, "記載なし", "https://www.harajuku-dental.jp/whitening.html", "上下マウスピース＋薬剤代"),
      t("whitening_dual", 48_400, 48_400, "オフィス1回＋ホーム", "https://www.harajuku-dental.jp/whitening.html"),
    ],
  }),
  harajuku1104({
    id: id(85), slug: "harada-dental-office-omotesando", name: "原田デンタルオフィス表参道",
    address: "東京都渋谷区神宮前6-2-9 ミナガワビル3F", walk_minutes: 5, website_url: "https://harada-dental-office.com/",
    features: [],
    catch_copy: "JR原宿駅から徒歩5分（日・祝休診、土曜は不定休）",
    treatments: [
      t("whitening_office", 35_200, 35_200, "1回（3回照射）", "https://harada-dental-office.com/price/", "税抜32,000円"),
      t("whitening_home", 31_900, 31_900, "記載なし", "https://harada-dental-office.com/price/", "上下トレー＋ジェル4本（税抜29,000円）"),
      t("ortho_aligner", 495_000, 495_000, "記載なし", "https://harada-dental-office.com/price/", "インビザラインGo 495,000円〜。検査代27,500円・毎回の診察料は別"),
    ],
  }),
  ebisu1105({
    id: id(86), slug: "maeda-shika-ebisu", name: "前田歯科医院",
    address: "東京都渋谷区恵比寿西1-2-7 恵比寿UKビル2F", walk_minutes: 2, website_url: "https://www.6480.jp/",
    features: ["access", "weekend"],
    catch_copy: "恵比寿駅から徒歩2分。平日20時まで、土曜は午前診療",
    treatments: [
      t("whitening_office", 33_000, 33_000, "2回", "https://www.6480.jp/whitening/", "2回分の合計額。追加の施術は16,500円"),
      t("whitening_home", 46_200, 46_200, "記載なし", "https://www.6480.jp/whitening/", "マウスピースとジェルのセット。追加ジェル1本4,620円"),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://www.6480.jp/orthodontic-fee/", "上下全体。基本検査料33,000円・診断料22,000円（必要な場合）・診察料5,500円/回・保定装置22,000円は別"),
      t("ortho_aligner", 1_045_000, 1_045_000, "記載なし", "https://www.6480.jp/orthodontic-fee/", "インビザライン上下全体。基本検査料33,000円・クリンチェック料2,200円・診察料5,500円/回・保定装置22,000円は別"),
      t("ortho_partial", 110_000, 220_000, "記載なし", "https://www.6480.jp/orthodontic-fee/", "部分的矯正・床装置。基本検査料33,000円・診察料5,500円/回は別"),
    ],
  }),
  harajuku1105({
    id: id(87), slug: "parthenon-shika", name: "パルテノン歯科",
    address: "東京都渋谷区千駄ヶ谷3-55-11 ヴィラパルテノンアネックス101", walk_minutes: 4, website_url: "https://www.parthenon-shika.jp/",
    features: [],
    catch_copy: "JR原宿駅竹下口から徒歩4分（日・祝休診）",
    treatments: [
      t("whitening_office", 5_000, 5_000, "記載なし", "https://www.parthenon-shika.jp/own-expense/whitening", "1歯あたりの料金"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://www.parthenon-shika.jp/own-expense/whitening"),
    ],
  }),
  takadanobaba1105({
    id: id(88), slug: "hamille-takada88", name: "歯科ハミール高田88",
    address: "東京都新宿区高田馬場1-27-6 KIビル4F", walk_minutes: 1, website_url: "https://hamille-takada88.com/",
    features: ["access", "weekend"],
    catch_copy: "高田馬場駅から徒歩1分。土日も診療（祝日休診）",
    treatments: [
      t("whitening_office", 33_000, 82_500, "1回〜3回", "https://hamille-takada88.com/menu/aesthetic/whitening/", "1回33,000円・3回コース82,500円"),
      t("whitening_home", 22_000, 33_000, "記載なし", "https://hamille-takada88.com/menu/aesthetic/whitening/", "片顎22,000円・上下33,000円。追加ジェル2本4,400円"),
      t("whitening_dual", 104_500, 104_500, "記載なし", "https://hamille-takada88.com/menu/aesthetic/whitening/", "オフィス3回コースとホームのセット"),
    ],
  }),
  takadanobaba1105({
    id: id(89), slug: "takadanobaba-nitta-shika", name: "高田馬場 新田歯科医院",
    address: "東京都新宿区高田馬場1-29-4", walk_minutes: 4, website_url: "http://2th.jp/",
    features: ["weekend"],
    catch_copy: "JR高田馬場駅から徒歩2〜4分。土曜も診療（日・祝休診）",
    treatments: [
      t("whitening_office", 38_500, 38_500, "1回（3回照射）", "http://2th.jp/menu/aesthetic/", "同日のPMTCは3,300円追加"),
      t("whitening_home", 22_000, 22_000, "記載なし", "http://2th.jp/menu/aesthetic/", "追加ジェル2本6,600円"),
      t("whitening_dual", 55_000, 55_000, "記載なし", "http://2th.jp/menu/aesthetic/"),
    ],
  }),
  takadanobaba1105({
    id: id(90), slug: "shinmi-takadanobaba", name: "しんみ歯科高田馬場",
    address: "東京都新宿区高田馬場2-17-6 ゆう文ビル10F", walk_minutes: 1, website_url: "https://shinmi-takadanobaba.com/",
    features: ["access", "weekend"],
    catch_copy: "高田馬場駅から徒歩1分。土曜も診療（日・祝休診）",
    treatments: [
      t("whitening_office", 19_800, 19_800, "記載なし", "https://shinmi-takadanobaba.com/price/"),
      t("whitening_home", 9_900, 9_900, "記載なし", "https://shinmi-takadanobaba.com/price/"),
      t("whitening_dual", 29_700, 29_700, "記載なし", "https://shinmi-takadanobaba.com/price/", "公式サイトの表記は「19,800円＋9,900円」"),
      t("ortho_wire", 880_000, 880_000, "記載なし", "https://shinmi-takadanobaba.com/price/", "保定装置33,000円・調整料3,300〜6,600円・自費の診察料800円は別"),
      t("ortho_aligner", 440_000, 1_100_000, "記載なし", "https://shinmi-takadanobaba.com/price/", "保定装置33,000円・調整料3,300〜6,600円は別"),
      t("ortho_partial", 200_000, 200_000, "記載なし", "https://shinmi-takadanobaba.com/price/", "200,000円〜。保定装置33,000円・調整料3,300〜6,600円は別"),
    ],
  }),
  takadanobaba1105({
    id: id(91), slug: "takadanobaba-kyousei", name: "高田馬場矯正歯科",
    address: "東京都新宿区高田馬場2-13-7 エスワンビル2F", walk_minutes: 5, website_url: "https://www.takadanobaba.info/",
    features: ["weekend"],
    catch_copy: "JR高田馬場駅から徒歩約5分。土日は隔週で診療（火・木・祝休診）",
    treatments: [
      t("ortho_wire", 715_000, 715_000, "記載なし", "https://www.takadanobaba.info/lp2/price/", "上下目立たない白い装置。矯正精密検査38,500円は別"),
      t("ortho_lingual", 1_045_000, 1_320_000, "記載なし", "https://www.takadanobaba.info/lp2/price/", "上顎のみ裏側1,045,000円・すべて裏側1,320,000円。矯正精密検査38,500円は別"),
      t("ortho_aligner", 660_000, 990_000, "記載なし", "https://www.takadanobaba.info/lp2/price/", "矯正精密検査38,500円は別"),
      t("ortho_partial", 330_000, 660_000, "記載なし", "https://www.takadanobaba.info/lp2/price/", "矯正精密検査38,500円は別"),
    ],
  }),
  takadanobaba1105({
    id: id(92), slug: "takadanobaba-dental", name: "高田馬場歯科・矯正歯科",
    address: "東京都新宿区高田馬場2-17-4 ベッセルイン高田馬場駅前 B1F", walk_minutes: 1, website_url: "https://takadanobaba-dental.com/",
    features: ["access", "weekend"],
    catch_copy: "高田馬場駅から徒歩1分。土日も診療（祝日休診）",
    treatments: [
      t("whitening_office", 33_000, 82_500, "1回〜3回", "https://takadanobaba-dental.com/menu/aesthetic/whitening", "1セット33,000円・3回コース82,500円"),
      t("whitening_home", 22_000, 33_000, "記載なし", "https://takadanobaba-dental.com/menu/aesthetic/whitening", "片顎22,000円・上下33,000円"),
      t("whitening_dual", 104_500, 104_500, "記載なし", "https://takadanobaba-dental.com/menu/aesthetic/whitening", "オフィス3回コースとホームのセット"),
      t("ortho_aligner", 495_000, 1_012_000, "記載なし", "https://takadanobaba-dental.com/menu/orthodontics/", "インビザライン ライト〜プレミアム。精密検査料44,000円・クリンチェック料33,000円・調整料3,300円/回・保定装置55,000円は別"),
    ],
  }),
  takadanobaba1105({
    id: id(93), slug: "wellness-shika-takadanobaba", name: "ウェルネス歯科高田馬場",
    address: "東京都新宿区高田馬場1-33-6 2F", walk_minutes: 1, website_url: "https://wellness-shika.tokyo/",
    features: ["access", "weekend"],
    catch_copy: "JR高田馬場駅戸山口から徒歩30秒。土曜も診療（水・日・祝休診）",
    treatments: [
      t("whitening_office", 50_600, 50_600, "3回", "https://wellness-shika.tokyo/whitening.html", "3回コース（税別46,000円）"),
      t("whitening_home", 33_000, 33_000, "記載なし", "https://wellness-shika.tokyo/whitening.html", "税別30,000円"),
    ],
  }),
  takadanobaba1105({
    id: id(94), slug: "inage-dental", name: "いなげ歯科",
    address: "東京都新宿区高田馬場1-21-10 豊電ビル3F", walk_minutes: 3, website_url: "https://www.inage-dental.com/",
    features: ["weekend"],
    catch_copy: "JR高田馬場駅戸山口から徒歩約2〜3分。土曜午前も診療",
    treatments: [
      t("whitening_home", 33_000, 33_000, "記載なし", "https://www.inage-dental.com/white/", "公式サイトは税別表記のため、消費税10%を加えた額にしています（税別30,000円）。追加ジェル1本3,300円（税別3,000円）"),
    ],
  }),
  takadanobaba1106({
    id: id(95), slug: "takadanobaba-ribon-shika", name: "高田馬場リボン歯科・矯正歯科",
    address: "東京都新宿区高田馬場2-13-2 プライムゲート3F", walk_minutes: 3, website_url: "https://ribon-shika.jp/takadanobaba/",
    features: ["weekend"],
    catch_copy: "JR山手線高田馬場駅から徒歩3分。日曜も診療（金・祝休診）",
    treatments: [
      t("whitening_office", 22_000, 33_000, "記載なし", "https://ribon-shika.jp/esthetic/", "1回目の料金。片顎22,000円・上下33,000円。グループ共通の料金ページの記載"),
      t("whitening_home", 27_500, 55_000, "記載なし", "https://ribon-shika.jp/esthetic/", "片顎27,500円・上下55,000円。追加ジェル（1週間分）11,000円。グループ共通の料金ページの記載"),
      t("whitening_dual", 47_300, 71_500, "記載なし", "https://ribon-shika.jp/esthetic/", "片顎47,300円・上下71,500円。グループ共通の料金ページの記載"),
      t("ortho_aligner", 1_034_000, 1_067_000, "記載なし", "https://ribon-shika.jp/orthodontic/invisalign/", "3年アカウント1,034,000円・5年アカウント1,067,000円。基本精密検査33,000円・アキシオグラフ33,000円・矯正管理費6,600円/回・保定装置22,000〜66,000円は別。グループ共通の料金ページの記載"),
      t("ortho_partial", 330_000, 440_000, "記載なし", "https://ribon-shika.jp/orthodontic/invisalign/", "前歯のマウスピース部分矯正。片顎330,000円・上下440,000円。基本精密検査33,000円・矯正管理費6,600円/回は別。グループ共通の料金ページの記載"),
    ],
  }),
  takadanobaba1106({
    id: id(96), slug: "takadanobaba-dc", name: "デンタルケアステーション高田馬場歯科",
    address: "東京都新宿区高田馬場4-3-12 2F", walk_minutes: 1, website_url: "https://takadanobaba-dc.com/",
    features: ["access"],
    catch_copy: "JR高田馬場駅改札から徒歩10秒（予約制）",
    treatments: [
      t("whitening_office", 48_400, 121_000, "1回〜3回（3ヶ月以内）", "https://takadanobaba-dc.com/price/", "1回48,400円・3回セット121,000円"),
      t("whitening_home", 38_500, 38_500, "記載なし", "https://takadanobaba-dc.com/price/", "追加ジェル1本2,300円"),
      t("ortho_wire", 825_000, 1_210_000, "記載なし", "https://takadanobaba-dc.com/price/", "公式サイトの表記は「成人矯正」（装置の種類の記載なし）。検査診断料33,000〜55,000円は別"),
      t("ortho_partial", 110_000, 550_000, "記載なし", "https://takadanobaba-dc.com/price/", "検査診断料33,000〜55,000円は別"),
    ],
  }),
  takadanobaba1106({
    id: id(97), slug: "takadanobaba-ekimae-dental", name: "高田馬場駅前デンタルクリニック",
    address: "東京都新宿区高田馬場2-16-2 1F", walk_minutes: 1, website_url: "https://www.ohori-dental.or.jp/",
    features: ["access", "weekend"],
    catch_copy: "JR高田馬場駅から徒歩1分。土日祝も診療",
    treatments: [
      t("whitening_home", 22_000, 22_000, "記載なし", "https://www.ohori-dental.or.jp/price.php", "マウスピース上下とジェル2本。PMTCとのセットは30,800円"),
      t("ortho_wire", 990_000, 990_000, "記載なし", "https://www.ohori-dental.or.jp/price.php", "セラミックブラケット（全顎）。相談料3,300円は別"),
      t("ortho_lingual", 660_000, 660_000, "記載なし", "https://www.ohori-dental.or.jp/price.php", "片顎の料金。相談料3,300円は別"),
      t("ortho_aligner", 1_100_000, 1_100_000, "記載なし", "https://www.ohori-dental.or.jp/price.php", "インビザライン（全顎）。相談料3,300円は別"),
      t("ortho_partial", 110_000, 110_000, "記載なし", "https://www.ohori-dental.or.jp/price.php", "部分矯正（MTM）1本あたりの料金。相談料3,300円は別"),
    ],
  }),
  takadanobaba1106({
    id: id(98), slug: "sudo-shika-takadanobaba", name: "すどう歯科医院",
    address: "東京都新宿区高田馬場4-11-9 三協ビル3F", walk_minutes: 3, website_url: "https://www.sudo-shika.jp/",
    features: ["weekend"],
    catch_copy: "高田馬場駅から徒歩3分。土曜も診療（木・日・祝休診、予約制）",
    treatments: [
      t("whitening_home", 27_500, 27_500, "記載なし", "https://www.sudo-shika.jp/price.html", "公式サイトは税別表記のため、消費税10%を加えた額にしています（初期費用 税別25,000円）。追加の薬液は約5,500円（税別約5,000円）"),
    ],
  }),
  takadanobabaToshima1106({
    id: id(99), slug: "yamashita-dentalclinic-takada", name: "山下歯科クリニック",
    address: "東京都豊島区高田3-13-7 サンユービル1F", walk_minutes: 3, website_url: "http://www.yamashita-dentalclinic.jp/",
    features: ["weekend"],
    catch_copy: "高田馬場駅から徒歩3分。土曜も診療（日・祝・第3木曜休診）",
    treatments: [
      t("whitening_home", 33_000, 33_000, "記載なし", "http://www.yamashita-dentalclinic.jp/perio.html", "公式サイトは税別表記のため、消費税10%を加えた額にしています（税別30,000円）。追加ジェル11,000円（税別10,000円）"),
    ],
  }),
];
