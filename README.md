# 自費歯科 診断ステップフォーム（Next.js App Router）

予算と希望の治療を4ステップで選ぶと、おすすめの歯科医院を最大3件提案するフォームです。
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
| `lib/matching.ts` | おすすめ順を決めるスコアリング |
| `lib/options.ts` | 選択肢と文言のマスタ（予算帯はここで調整） |
| `lib/types.ts` | 型定義 |
| `lib/sample-clinics.ts` | サンプル医院データ |
| `lib/supabase.ts` | サーバー用 Supabase クライアント |
| `supabase/schema.sql` | テーブル定義（clinics / clinic_treatments / diagnosis_leads）と RLS |
| `supabase/seed.sql` | サンプル医院の投入SQL（`scripts/generate-seed.ts` で生成） |

## おすすめ順の決め方（100点満点）

- 予算との適合 40点：価格帯の上限まで予算内なら満点、最低価格だけ予算内なら部分点、予算の2割超で0点
- エリア 25点：希望の都道府県に候補があれば、その県の医院だけを提案
- 重視ポイント 20点：選んだ項目に医院の特徴が何個当てはまるか
- 評判 15点：口コミ評価と、その治療の年間症例数

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

医院データの収集、記事生成、メルマガ、おすすめ枠（Stripe）は [ROUTINES.md](ROUTINES.md) を参照してください。

## オンライン相談と送客（収益化）

来院前に「誰が診てくれるか」を選び、写真とお悩みだけで概算を聞ける仕組みです。医院には相談1件ごとに定額で請求します。

**患者さんの流れ（/consult）**：お悩み（歯並びのイラスト）→ 総額の目安 → 先生を選ぶ（最大3院）→ 写真と相談内容（任意）→ 連絡先と同意 → 送信。診断結果・医院ページ・トップから入れます。

**医院の流れ**：
1. `/for-clinics` の「オンライン相談の受付」から申し込む（`clinic_partners` に pending で保存、運営に通知）
2. 運営が担当医の資格表記を確認し、`doctors` に登録（`is_published = true`）、`clinic_partners.status = 'active'` と `clinic_id` を設定
3. 相談が届くとメールで通知。リンク（`/clinic/reply/…`、30日有効）から概算とひとことを返信。表現チェックに引っかかる文言は送れない
4. 患者さんに返信がメールで届き、「予約する」から医院の予約ページへ（予約ボタンを押した数を記録）
5. 毎月1日 `/api/cron/billing` が前月分を Stripe の請求書（send_invoice・14日払い）で送る。同じ人から同じ医院への30日以内の再相談は数えない

| ファイル | 役割 |
|---|---|
| `supabase/004_consultations.sql` | clinic_partners / doctors / consultations / consultation_requests、写真用の非公開バケット |
| `lib/consult.ts` | お悩みの種類、候補の治療、費用の目安の計算 |
| `lib/consult-data.ts` | 相談を受け付けている医院と担当医（未接続時は架空のサンプル） |
| `lib/consult-mail.ts` | 医院への通知・患者さんへのメール、返信トークン |
| `components/ConsultForm.tsx`, `app/consult/page.tsx` | 相談フォーム |
| `app/api/consult/*` | 受付・写真アップロード先・医院の返信・予約リンク |
| `app/clinic/reply/[token]/page.tsx` | 医院の返信画面（検索除外） |
| `app/api/cron/billing/route.ts` | 月次請求と、1年を過ぎた写真の削除 |
| `app/privacy/page.tsx` | プライバシーポリシーのひな形（公開前に要確認） |

**法令まわりで決めていること**（公開前に弁護士の確認を推奨）：
- 料金は「相談の取り次ぎ1件ごとの定額」。治療の成約や治療費の割合では決めない（自費診療の紹介料は一律に合法とは言えないため）
- 「診断」とは言わず「オンライン相談・概算」と表示。検査前の目安で診断ではないことを各画面とメールに明記
- 歯の写真は要配慮個人情報として扱い、取得と医院への提供に明示の同意を取る。患者さんのメールアドレスは医院に渡さない
- 相談先は提携医院だけであることと手数料を受け取っていることを画面に表示し、並び順は口コミ評価順（手数料は関係しない）

セットアップは `004_consultations.sql` を 003 の後に実行し、`.env` に `CONSULT_LEAD_PRICE` と `ADMIN_EMAIL` を追加します。
