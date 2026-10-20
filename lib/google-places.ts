// Google Places API (New) で医院を探し、評価・口コミ件数を取得する
// 注意：Google マップの利用規約上、評価などのデータは長期保存が制限されています。
// place_id 以外は「表示用に毎日取り直す」前提で rating_updated_at を持たせ、表示時は Google の帰属表示を出してください。

const ENDPOINT = "https://places.googleapis.com/v1";

export interface PlaceSummary {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  websiteUrl: string | null;
}

function headers(fieldMask: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY が未設定です");
  return { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask };
}

type RawPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
};

const toSummary = (p: RawPlace): PlaceSummary => ({
  id: p.id,
  name: p.displayName?.text ?? "",
  address: p.formattedAddress ?? "",
  rating: p.rating ?? null,
  reviewCount: p.userRatingCount ?? 0,
  websiteUrl: p.websiteUri ?? null,
});

/** 例: searchClinics("横浜駅 矯正歯科") */
export async function searchClinics(query: string, max = 10): Promise<PlaceSummary[]> {
  const res = await fetch(`${ENDPOINT}/places:searchText`, {
    method: "POST",
    headers: headers("places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri"),
    body: JSON.stringify({ textQuery: query, languageCode: "ja", regionCode: "JP", pageSize: max }),
  });
  if (!res.ok) throw new Error(`Places searchText ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).map(toSummary);
}

export async function getPlace(placeId: string): Promise<PlaceSummary> {
  const res = await fetch(`${ENDPOINT}/places/${placeId}?languageCode=ja`, {
    headers: headers("id,displayName,formattedAddress,rating,userRatingCount,websiteUri"),
  });
  if (!res.ok) throw new Error(`Places get ${res.status}: ${await res.text()}`);
  return toSummary((await res.json()) as RawPlace);
}
