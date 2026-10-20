# 日次タスクの自動化

Vercel Cron（`vercel.json`）が決まった時刻に API を呼び、Supabase を更新します。実行結果は `routine_runs` テーブルに残ります。

| タスク | いつ（日本時間） | 呼ばれるAPI | やること |
|---|---|---|---|
| 医院データ収集・更新 | 毎日 3:00 | `/api/cron/clinics` | 掲載医院の Google 評価・口コミ数を更新 → **その日の山手線の駅**（30日で一周）の周辺を4つの治療で検索し、口コミの多い新しい医院を5件、公式サイトから自費メニューの価格を Claude が読み取って登録 → 30日以上前の価格を3件再調査 |
| SEO・AI検索向け記事 | 毎日 5:00 | `/api/cron/articles` | `keyword_queue` の検索語から1本、自社の価格データを使った記事を生成。表現チェックを通ったものだけ公開 |
| メルマガ | 毎週火曜 9:00 | `/api/cron/newsletter` | その週の新着記事を紹介するメルマガを作り、確認済みの購読者に Resend で一斉送信 |
| おすすめ枠 | 申込み時に即時 | `/api/stripe/webhook` | 決済完了でトップの「おすすめ枠（PR）」に自動掲載。解約・支払い失敗で自動的に外す |

## 人の確認を挟んでいるところ（初期設定）

- **自動で見つけた医院は非公開で登録**します（`is_published = false`）。価格と出典URL（`clinic_treatments.source_url`）を確認して公開に切り替えてください。
- **記事は下書き保存**です。`AUTO_PUBLISH_ARTICLES=true` にすると、医療広告ガイドラインの表現チェック（`lib/compliance.ts`）を通った記事は自動公開されます。引っかかった記事は理由が `compliance_issues` に入り、常に下書きのままです。
- **メルマガ**は表現チェックに引っかかると送信せず下書き保存します。

## 山手線の駅から攻める

都内全域ではなく、山手線30駅を1日1駅ずつ調べます（`lib/yamanote.ts`）。1周30日で約150院、2周目以降は各駅の未登録医院を追加していきます。駅ごとの進み具合は `station_research` テーブルに残ります。

- トップの路線図（`components/YamanoteMap.tsx`）：駅を押すとその駅のおすすめ医院が出て、なければ山手線で2駅以内の医院を出します。治療で絞り込み可。そのまま「この駅で診断」に進めます
- 駅ページ `/station/[駅]`：30ページ。「渋谷 ホワイトニング 料金」のような駅名検索の受け皿
- 診断フォーム：東京都を選ぶと山手線の駅を任意で選べ、同じ駅・近い駅の医院ほど上に出ます

## SEO・GEO（AI検索）対策として入れたもの

- `/area/[都道府県]/[治療]`：28ページ。「横浜 矯正 予算50万」のような検索に、予算帯ごとの医院一覧で答えるページ。医院データが増えると毎日自動更新
- `/articles/[slug]`：記事 + Article / FAQPage の構造化データ
- `/clinics/[slug]`：医院ページ + Dentist の構造化データ
- `/sitemap.xml`、`/robots.txt`（GPTBot・ClaudeBot・PerplexityBot などの AI クローラーを明示的に許可）、`/llms.txt`（AI 向けのサイト要約）
- 記事は冒頭で答えを言い切り、「当サイト調べ」の価格データ（院数・時点つき）を必ず使う構成。AI 検索は独自の一次データと出典が明確なページを引用しやすいため

## おすすめ枠のつくり方

1. Stripe で月額の商品と **Payment Link** を作成（完了後の遷移先はサイトトップ等）
2. Webhook を `https://<ドメイン>/api/stripe/webhook` に登録。イベントは `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`
3. 環境変数 `STRIPE_SPONSOR_PAYMENT_LINK` / `STRIPE_WEBHOOK_SECRET` を設定
4. 医院は `/for-clinics` から申し込み → 申込みIDつきで決済リンクへ → 決済完了で掲載＆掲載開始メール

掲載枠には「PR」を表示しています（2023年10月からのステルスマーケティング規制への対応）。診断結果の順位には影響させていません。

## 法令まわりで注意したこと

- **医療広告ガイドライン**：誇大・保証・比較優良表現の機械チェック、費用には「自費診療・目安・リスクの説明」の注記を自動付与。ただし最終判断は人が行ってください
- **特定電子メール法**：ダブルオプトイン、送信者情報、ワンクリック配信停止（List-Unsubscribe ヘッダーにも対応）
- **Google マップのデータ**：利用規約上、評価などは長期保存が制限されています。毎日取り直す前提にしていますが、表示時は Google の帰属表示を出し、規約を確認してください

## セットアップ

1. `supabase/schema.sql` → `002_routines.sql` → `003_yamanote.sql` → `seed.sql` の順に実行
2. `npm i @supabase/supabase-js @anthropic-ai/sdk resend stripe marked @tailwindcss/typography`
3. `.env.example` の値を Vercel の環境変数に登録してデプロイ（Cron は本番デプロイで有効になります）
4. 検索語を増やすときは `keyword_queue` に行を足すだけで、毎日1本ずつ記事になります

医院リサーチは1回あたり数ページを読むため、Vercel Pro（関数の最長800秒）を想定しています。Hobby では `app/api/cron/clinics/route.ts` の件数を減らしてください。
