// Google Places API (New) で医院を探し、公式サイトのURLを見つける
// Google Maps Platform の規約で保存が認められているのは place_id（と30日以内の緯度経度）だけ。
// 名称・住所・URL はその場の調査にだけ使い、評価や口コミ件数は取得しない。

const ENDPOINT = "https://places.googleapis.com/v1";

export interface PlaceSummary {
  id: string;
  name: string;
  address: string;
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
  websiteUri?: string;
};

const toSummary = (p: RawPlace): PlaceSummary => ({
  id: p.id,
  name: p.displayName?.text ?? "",
  address: p.formattedAddress ?? "",
  websiteUrl: p.websiteUri ?? null,
});

/** 例: searchClinics("横浜駅 矯正歯科") */
export async function searchClinics(query: string, max = 10): Promise<PlaceSummary[]> {
  const res = await fetch(`${ENDPOINT}/places:searchText`, {
    method: "POST",
    headers: headers("places.id,places.displayName,places.formattedAddress,places.websiteUri"),
    body: JSON.stringify({ textQuery: query, languageCode: "ja", regionCode: "JP", pageSize: max }),
  });
  if (!res.ok) throw new Error(`Places searchText ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).map(toSummary);
}
