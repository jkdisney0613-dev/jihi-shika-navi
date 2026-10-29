// 実在する医院のデータ（渋谷駅周辺・ホワイトニングと矯正）。2026-10-26 に各医院の公式サイトの料金ページで確認した内容です。
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
];
