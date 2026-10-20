// テスト公開（需要検証）モード：医院はサンプルのまま、相談は医院に送らず「開始のお知らせ希望」として記録する
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
