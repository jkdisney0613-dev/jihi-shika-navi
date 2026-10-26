# 自費歯科 診断ステップフォーム（Next.js App Router）

予算と希望の治療を4ステップで選ぶと、条件に合う歯科医院を最大3件表示するフォームです。
Supabase が未設定でもサンプルデータ（架空の8医院）で動きます。

## 画面の流れ

1. 治療を選ぶ（ホワイトニング／矯正／インプラント／自費クリーニング）
2. 希望を選ぶ（例：目立たないマウスピース矯正）
3. 予算を選ぶ（例：〜50万円。治療ごとに選択肢が変わる）
4. エリアと重視すること（駅近・土日診療など）を選ぶ → 診断結果

1〜3は選んだ瞬間に次へ進みます。カテゴリを変えると後続の回答はリセットされます。

## ファイル構成

| パス | 役割 |
|---|---|
| `app/diagnosis/page.tsx` | 診断ページ（SEO用の title / description 付き） |
| `components/DiagnosisForm.tsx` | ステップフォームと結果表示（クライアントコンポーネント） |
| `app/api/diagnosis/route.ts` | 回答の検証 → 医院取得 → スコアリング → リード保存 |
| `lib/matching.ts` | 条件の一致度で並べるスコアリング |
| `lib/options.ts` | 選択肢と文言のマスタ（予算帯はここで調整） |
| `lib/types.ts` | 型定義 |
| `lib/sample-clinics.ts` | サンプル医院データ |
| `lib/supabase.ts` | サーバー用 Supabase クライアント |
| `supabase/schema.sql` | テーブル定義（clinics / clinic_treatments / diagnosis_leads）と RLS |
| `supabase/seed.sql` | サンプル医院の投入SQL（`scripts/generate-seed.ts` で生成） |

## 並び順の決め方（条件の一致度・100点満点）

- 予算との適合 45点：価格帯の上限まで予算内なら満点、最低価格だけ予算内なら部分点、予算の2割超で0点
- エリア 30点：希望の都道府県に候補があれば、その県の医院だけを提案
- 重視ポイント 25点：選んだ項目に医院の特徴が何個当てはまるか

口コミ評価・掲載料は使いません（医療広告ガイドラインの比較優良広告を避けるため）。

予算内の医院を先に、その中でスコア順に並べます。予算を超える医院は「予算オーバー」と表示します。

## セットアップ

```bash
npx create-next-app@latest dental-diagnosis --ts --tailwind --app --import-alias "@/*"
cd dental-diagnosis
npm i @supabase/supabase-js
# このフォルダの app/ components/ lib/ supabase/ scripts/ をプロジェクト直下にコピー
npm run dev   # http://localhost:3000/diagnosis
```

Supabase につなぐ場合：

1. SQL Editor で `supabase/schema.sql` → `supabase/seed.sql` の順に実行
2. `.env.example` を `.env.local` にコピーして URL と service_role キーを設定（Vercel の環境変数にも同じものを登録）

service_role キーは API Route（サーバー）でだけ使い、ブラウザには出しません。`diagnosis_leads` は RLS で匿名アクセスを拒否しています。

## 確認したこと

- `tsc` の型チェックと `next build` が通ることを確認済み（Next.js 15 / React 19 / TypeScript 5）
- 例の「マウスピース矯正・〜50万円・東京都・駅近重視」で API を叩くと、新宿クリア矯正歯科（44万円〜、予算内）が1位、続いて予算オーバー表示付きで青山・銀座が返ることを確認済み
- 不正な回答は 400 を返す

## 日次タスクの自動化

医院データの収集、記事生成、メルマガ、PR枠（Stripe）は [ROUTINES.md](ROUTINES.md) を参照してください。

## オンライン相談と送客（収益化）

来院前に「誰が診てくれるか」を選び、写真とお悩みだけで概算を聞ける仕組みです。医院には相談1件ごとに定額で請求します。

**患者さんの流れ（/consult）**：お悩み（歯並びのイラスト）→ 総額の目安 → 先生を選ぶ（最大3院）→ 写真と相談内容（任意）→ 連絡先と同意 → 送信。診断結果・医院ページ・トップから入れます。

**医院の流れ**：
1. `/for-clinics` の「オンライン相談の受付」から申し込む（`clinic_partners` に pending で保存、運営に通知）
2. 運営が担当医の資格表記を確認し、`doctors` に登録（`is_published = true`）、`clinic_partners.status = 'active'` と `clinic_id` を設定
3. 相談が届くとメールで通知。リンク（`/clinic/reply/…`、30日有効）から概算とひとことを返信。表現チェックに引っかかる文言は送れない
4. 患者さんに返信がメールで届き、「予約する」から医院の予約ページへ（予約ボタンを押した数を記録）
5. 毎月1日 `/api/cron/cleanup` が1年を過ぎた相談の写真を消す（相談の受付は無料で、医院への請求はしない）

| ファイル | 役割 |
|---|---|
| `supabase/004_consultations.sql` | clinic_partners / doctors / consultations / consultation_requests、写真用の非公開バケット |
| `lib/consult.ts` | お悩みの種類、候補の治療、費用の目安の計算 |
| `lib/consult-data.ts` | 相談を受け付けている医院と担当医（未接続時は架空のサンプル） |
| `lib/consult-mail.ts` | 医院への通知・患者さんへのメール、返信トークン |
| `components/ConsultForm.tsx`, `app/consult/page.tsx` | 相談フォーム |
| `app/api/consult/*` | 受付・写真アップロード先・医院の返信・予約リンク |
| `app/clinic/reply/[token]/page.tsx` | 医院の返信画面（検索除外） |
| `app/api/cron/cleanup/route.ts` | 1年を過ぎた相談写真の削除 |
| `app/privacy/page.tsx` | プライバシーポリシーのひな形（公開前に要確認） |

**法令まわりで決めていること**（公開前に弁護士の確認を推奨）：
- 料金は「相談の取り次ぎ1件ごとの定額」。治療の成約や治療費の割合では決めない（自費診療の紹介料は一律に合法とは言えないため）
- 「診断」とは言わず「オンライン相談・概算」と表示。検査前の目安で診断ではないことを各画面とメールに明記
- 歯の写真は要配慮個人情報として扱い、取得と医院への提供に明示の同意を取る。患者さんのメールアドレスは医院に渡さない
- 相談先は提携医院だけであることと手数料を受け取っていることを画面に表示し、並び順は口コミ評価順（手数料は関係しない）

セットアップは `004_consultations.sql` を 003 の後に実行し、`.env` に `ADMIN_EMAIL` を追加します。相談の受付は医院・患者とも無料です（相談1件ごとの課金は療担規則の紹介料にあたるおそれがあるため廃止）。

## テスト公開（Vercel）

1. Vercel でこのリポジトリを Import する
2. 環境変数 `NEXT_PUBLIC_DEMO_MODE=true` を「設定」（非公開ではない値）として登録する。ビルド時に埋め込まれるので、変えたら再デプロイが必要
3. 人数を記録するときは Supabase で `schema.sql` → `002` → `003` → `004` → `005_demo.sql` を実行し、`NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY`（こちらは「秘密」）を登録して再デプロイする

`main` に push すると本番に自動で公開されます。

## 本番公開の準備（2026-10-26）

本番（`NEXT_PUBLIC_DEMO_MODE` を外した状態）では、架空のサンプルではなく実在の医院を出します。

- **掲載している医院**：渋谷駅周辺のホワイトニング10院・矯正11院（重複を除いて16院）。`lib/real-clinics.ts` に、2026-10-26 に各医院の公式サイトの料金ページで確認した医院名・所在地・料金・出典URLを入れています。Supabase につなぐ前はこのファイルを表示し、つないだ後は `supabase/007_real_clinics.sql` で同じ内容が入ります
- **治療はホワイトニングと矯正だけ**表示（`LIVE_CATEGORIES`）。インプラント・自費クリーニングは医院データがそろってから出します
- **税表記がない料金**は記載額のまま載せ、「公式サイトに税込・税抜の記載がない」と注記。精密検査料など別にかかる費用も注記しています（`price_note`）
- **オンライン相談の入口は隠しています**（`NEXT_PUBLIC_CONSULT_ENABLED`）。提携医院がいないのに、実在の医院が相談を受け付けているように見えるのを避けるため
- **検索エンジンには載せません**。`NEXT_PUBLIC_SITE_LAUNCHED=true` にするまで全ページ noindex、robots.txt もクロール禁止です。URL を知っている人だけが見られます

一般公開するときの手順：

1. Supabase で `schema.sql` → `002` → `003` → `004` → `005_demo.sql` → `006_legal.sql` → `007_real_clinics.sql` を実行し、Vercel に `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を登録（医院からの掲載停止の依頼を受けるのに必須）
2. 自動で医院を増やすために `GOOGLE_MAPS_API_KEY`・`ANTHROPIC_API_KEY`・`CRON_SECRET`・`ADMIN_EMAIL`・`RESEND_API_KEY` を登録
3. `NEXT_PUBLIC_DEMO_MODE` を削除（または `false`）して再デプロイ → 実在の医院が表示される。この時点ではまだ検索に出ない
4. 表示を確認したら `NEXT_PUBLIC_SITE_LAUNCHED=true` にして再デプロイ → 検索エンジンに公開

## 法的リスク対策（2026-10-22）

`supabase/006_legal.sql` を 005 の後に実行してください。

- Google の評価・口コミ件数は保存も表示もしない。Places API は公式サイトを見つけるためだけに使い、保存は place_id のみ
- 医院名・所在地・料金は医院の公式サイトから取り、医院ページに料金の出典URLと確認日を出す
- 並び順は予算・エリア・希望条件の一致度だけ。「おすすめNo.1」などの順位表現は使わない
- 医院向けに `/for-clinics/request`（情報修正・掲載停止の依頼）を用意。掲載停止は受付と同時に非公開にし、`ADMIN_EMAIL` に通知
- 収益は月額定額の PR 枠だけ。PR 枠の医院はトップと医院ページに「PR」を表示。相談件数・成約に応じた料金は取らない
- 「診断」という言葉は医療的な診断と誤解されるため、画面では「探す・比べる」と表示（URL の /diagnosis はそのまま）
