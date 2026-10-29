// テスト公開（需要検証）モード：医院はサンプルのまま、相談は医院に送らず「開始のお知らせ希望」として記録する
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// 一般公開（検索エンジンに載せる）かどうか。true にするまでは全ページを noindex にし、robots.txt でもクロールを止める
export const SITE_LAUNCHED = process.env.NEXT_PUBLIC_SITE_LAUNCHED === "true";

// オンライン相談の入口を出すか。提携医院がいない本番では、実在の医院が相談を受け付けていると誤解されないよう隠す
export const CONSULT_ENABLED = DEMO_MODE || process.env.NEXT_PUBLIC_CONSULT_ENABLED === "true";
