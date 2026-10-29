-- 自費歯科ナビ：Supabase の SQL Editor にこのファイルの中身を全部貼り付けて「Run」を押すだけで、必要な表がすべてできます。
-- 何度実行しても大丈夫です（すでにある表はそのまま使います）。

-- ===== schema.sql =====
-- 歯科自費診療 診断サイト：医院マスタと診断結果（リード）のテーブル
-- Supabase の SQL Editor でそのまま実行できます。

create extension if not exists "pgcrypto";

-- 医院
create table if not exists public.clinics (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,            -- /clinics/[slug] のURLに使う
  name             text not null,
  prefecture       text not null,
  city             text not null,
  nearest_station  text not null,
  walk_minutes     smallint not null default 0,
  features         text[] not null default '{}',    -- price / track_record / access / weekend / painless / female_doctor
  catch_copy       text not null default '',
  image_url        text,
  booking_url      text,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists clinics_prefecture_idx on public.clinics (prefecture) where is_published;

-- 医院ごとの自費メニューと価格帯
create table if not exists public.clinic_treatments (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  category        text not null check (category in ('whitening','orthodontics','implant','cleaning')),
  option_code     text not null,                    -- lib/types.ts の TreatmentOption と一致させる
  price_min       integer not null check (price_min >= 0),   -- 円・税込
  price_max       integer not null check (price_max >= price_min),
  duration_label  text not null default '',
  cases_count     integer not null default 0,       -- 年間症例数
  unique (clinic_id, option_code)
);

create index if not exists clinic_treatments_option_idx on public.clinic_treatments (option_code, price_min);

-- 診断の回答と提案結果（後で Resend でフォローメールを送るためのリード）
create table if not exists public.diagnosis_leads (
  id                   uuid primary key default gen_random_uuid(),
  category             text not null,
  option_code          text not null,
  budget_max           integer,                     -- null =「こだわらない」
  prefecture           text not null,
  priorities           text[] not null default '{}',
  matched_clinic_ids   uuid[] not null default '{}',
  email                text,                        -- 結果メール希望時のみ
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  created_at           timestamptz not null default now()
);

create index if not exists diagnosis_leads_created_idx on public.diagnosis_leads (created_at desc);

-- updated_at 自動更新
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists clinics_set_updated_at on public.clinics;
create trigger clinics_set_updated_at before update on public.clinics
  for each row execute function public.set_updated_at();

-- RLS：医院データは誰でも閲覧可、リードは service_role（API Route）からのみ書き込み
alter table public.clinics           enable row level security;
alter table public.clinic_treatments enable row level security;
alter table public.diagnosis_leads   enable row level security;

drop policy if exists "clinics are public" on public.clinics;
create policy "clinics are public" on public.clinics
  for select using (is_published);

drop policy if exists "treatments are public" on public.clinic_treatments;
create policy "treatments are public" on public.clinic_treatments
  for select using (exists (select 1 from public.clinics c where c.id = clinic_id and c.is_published));

-- diagnosis_leads にはポリシーを作らない＝anon からは読み書き不可（service_role は RLS をバイパス）

-- ===== 002_routines.sql =====
-- 日次タスク（医院データ更新・記事生成・メルマガ・おすすめ枠）用の追加テーブル
-- schema.sql の後に実行してください。

-- 1. 医院データの収集・更新 -------------------------------------------------
alter table public.clinics
  add column if not exists google_place_id     text unique,
  add column if not exists website_url         text,
  add column if not exists source              text not null default 'manual',  -- manual / auto_research
  add column if not exists researched_at       timestamptz;                     -- メニュー価格を最後に調べた日時

-- 価格の出典（医療広告ガイドライン対応：どのページに書いてあったかを残す）
alter table public.clinic_treatments
  add column if not exists source_url  text,
  add column if not exists updated_at  timestamptz not null default now();

-- 日次バッチの実行ログ（何件見つけて、何件更新したか）
create table if not exists public.routine_runs (
  id           uuid primary key default gen_random_uuid(),
  routine      text not null,          -- clinics / articles / newsletter
  status       text not null,          -- success / partial / failed
  summary      jsonb not null default '{}',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- 2. SEO・AI検索向け記事 ----------------------------------------------------
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text not null,
  keyword       text not null,          -- 狙う検索語（例：横浜 矯正 予算50万）
  category      text,                   -- whitening / orthodontics / implant / cleaning
  prefecture    text,
  body_md       text not null,          -- 本文（Markdown）
  faq           jsonb not null default '[]',   -- [{q, a}] → FAQPage 構造化データ
  status        text not null default 'draft' check (status in ('draft','published','rejected')),
  compliance_issues jsonb not null default '[]', -- 医療広告ガイドラインで引っかかった表現
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists articles_published_idx on public.articles (published_at desc) where status = 'published';

-- まだ記事にしていない検索語のキュー（cron が上から順に消化する）
create table if not exists public.keyword_queue (
  keyword     text primary key,
  category    text,
  prefecture  text,
  priority    smallint not null default 0,
  done_at     timestamptz
);

-- 3. メルマガ ---------------------------------------------------------------
create table if not exists public.subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique,
  interest         text,                       -- 診断で選んだ治療カテゴリ
  prefecture       text,
  status           text not null default 'pending' check (status in ('pending','active','unsubscribed')),
  token            uuid not null default gen_random_uuid(),  -- 確認・配信停止リンク用
  confirmed_at     timestamptz,
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists public.newsletter_issues (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  body_html   text not null,
  sent_count  integer not null default 0,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- 4. おすすめ枠（月額掲載） ---------------------------------------------------
create table if not exists public.sponsorships (
  id                      uuid primary key default gen_random_uuid(),
  clinic_id               uuid references public.clinics(id) on delete set null,
  clinic_name             text not null,          -- 未登録医院からの申込みにも対応
  contact_email           text not null,
  website_url             text,
  prefecture              text,
  message                 text,
  status                  text not null default 'pending'
                            check (status in ('pending','active','past_due','canceled')),
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists sponsorships_active_idx on public.sponsorships (status, current_period_end);

-- RLS：公開記事と有効な掲載だけ誰でも読める。それ以外は service_role のみ
alter table public.routine_runs      enable row level security;
alter table public.articles          enable row level security;
alter table public.keyword_queue     enable row level security;
alter table public.subscribers       enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.sponsorships      enable row level security;

drop policy if exists "published articles are public" on public.articles;
create policy "published articles are public" on public.articles for select using (status = 'published');

-- 最初の検索語（あとから追加していけば毎日1本ずつ記事になる）
insert into public.keyword_queue (keyword, category, prefecture, priority) values
  ('横浜 矯正 予算50万', 'orthodontics', '神奈川県', 10),
  ('インプラント 口コミ 選び方', 'implant', null, 9),
  ('マウスピース矯正 費用 相場', 'orthodontics', null, 9),
  ('ホワイトニング 何回で白くなる', 'whitening', null, 8),
  ('新宿 ホワイトニング 安い', 'whitening', '東京都', 7),
  ('インプラント 1本 費用 東京', 'implant', '東京都', 7),
  ('PMTC 保険適用 違い', 'cleaning', null, 6),
  ('部分矯正 前歯 期間', 'orthodontics', null, 6)
on conflict do nothing;

-- ===== 003_yamanote.sql =====
-- 山手線の駅単位でリサーチ・表示するための追加
-- 002_routines.sql の後に実行してください。

alter table public.clinics add column if not exists station_slug text;  -- lib/yamanote.ts の slug（例：shibuya）
create index if not exists clinics_station_idx on public.clinics (station_slug) where is_published;

-- 駅ごとのリサーチ状況（何日に何件見つけたか。路線図の「調査済み」表示に使う）
create table if not exists public.station_research (
  station_slug     text primary key,
  last_run_at      timestamptz,
  clinics_found    integer not null default 0,
  runs             integer not null default 0
);
alter table public.station_research enable row level security;

-- 駅名を含む検索語を記事キューに追加
insert into public.keyword_queue (keyword, category, prefecture, priority) values
  ('渋谷 ホワイトニング 料金', 'whitening', '東京都', 9),
  ('新宿 マウスピース矯正 予算50万', 'orthodontics', '東京都', 9),
  ('品川 インプラント 費用', 'implant', '東京都', 8),
  ('池袋 矯正 安い', 'orthodontics', '東京都', 8),
  ('恵比寿 歯のクリーニング 自費', 'cleaning', '東京都', 7),
  ('上野 インプラント 口コミ', 'implant', '東京都', 7)
on conflict do nothing;

alter table public.diagnosis_leads add column if not exists station_slug text;

-- ===== 004_consultations.sql =====
-- オンライン相談（来院前に担当医を選んで概算を聞く）と、医院への送客課金
-- 003_yamanote.sql の後に実行してください。

-- 医院ごとの送客契約。status = 'active' の医院だけが相談先に表示される
create table if not exists public.clinic_partners (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid references public.clinics(id) on delete set null,
  clinic_name         text not null,
  contact_email       text not null,          -- 相談の通知先
  website_url         text,
  plan                text not null default 'per_lead' check (plan in ('per_lead', 'listing')),
  lead_price          integer not null default 5000,   -- 相談1件あたり（円・税込）。治療費の割合では決めない
  stripe_customer_id  text,
  status              text not null default 'pending' check (status in ('pending', 'active', 'paused')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists clinic_partners_clinic_idx on public.clinic_partners (clinic_id) where clinic_id is not null;
alter table public.clinic_partners enable row level security;

-- 担当医。資格は医院の申告どおりに出し、表示前に医療広告ガイドラインで確認する
create table if not exists public.doctors (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics(id) on delete cascade,
  name             text not null,
  role             text,                       -- 例：院長、矯正担当医
  credentials      text[] not null default '{}',  -- 例：{日本矯正歯科学会 認定医}
  years            integer,                    -- 歯科医師としての経験年数
  specialties      text[] not null default '{}',  -- TreatmentOption の値
  days             text,                       -- 例：火・木・土
  photo_url        text,
  message          text,                       -- 患者さんへのひとこと
  accepts_online   boolean not null default true,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists doctors_clinic_idx on public.doctors (clinic_id) where is_published;
alter table public.doctors enable row level security;
drop policy if exists "doctors are public when published" on public.doctors;
create policy "doctors are public when published" on public.doctors for select using (is_published);

-- 患者さんの相談（1回の送信で最大3院に送れる。医院ごとの行は consultation_requests）
create table if not exists public.consultations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null,
  age_range        text,
  concern          text not null,              -- 歯並びのタイプ（lib/consult.ts の CONCERNS）
  option           text not null,              -- 希望の治療（TreatmentOption）
  budget_max       integer,
  wishes           text[] not null default '{}',
  note             text,
  photo_paths      text[] not null default '{}',  -- Storage の consult-photos バケット内のパス
  estimate_min     integer,
  estimate_max     integer,
  consent_at       timestamptz not null,       -- 要配慮個人情報の取得と医院への提供に同意した日時
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  created_at       timestamptz not null default now()
);
alter table public.consultations enable row level security;

create table if not exists public.consultation_requests (
  id               uuid primary key default gen_random_uuid(),
  consultation_id  uuid not null references public.consultations(id) on delete cascade,
  clinic_id        uuid not null references public.clinics(id),
  partner_id       uuid not null references public.clinic_partners(id),
  doctor_id        uuid references public.doctors(id),
  reply_token_hash text not null unique,       -- 医院の返信リンク用トークンの SHA-256
  status           text not null default 'sent' check (status in ('sent', 'replied', 'booked', 'declined')),
  reply_min        integer,
  reply_max        integer,
  reply_plan       text,
  reply_message    text,
  replied_at       timestamptz,
  -- 課金：同じメールアドレスから同じ医院への相談は30日に1件だけ数える
  billable         boolean not null default true,
  lead_price       integer not null,
  stripe_invoice_item_id text,
  billed_at        timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists consultation_requests_unbilled_idx on public.consultation_requests (partner_id) where billable and billed_at is null;
alter table public.consultation_requests enable row level security;

-- 相談の写真は非公開バケットに置き、医院には期限つきURLで渡す
-- 1枚5MBまで・画像だけ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consult-photos', 'consult-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- ===== 005_demo.sql =====
-- テスト公開（需要検証）用：オンライン相談を「開始のお知らせ希望」として記録する
-- schema.sql と 002_routines.sql の後に実行（subscribers は 002 で作成）
create table if not exists consult_interest (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  age_range text,
  concern text not null,
  option text not null,
  budget_max integer,
  clinic_ids uuid[] not null default '{}',
  wishes text[] not null default '{}',
  note text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);
alter table consult_interest enable row level security;  -- ポリシーなし＝匿名アクセスは全拒否（サーバーの service_role だけが書ける）

-- 需要の集計（SQL Editor で実行）
create or replace view demand_daily with (security_invoker = true) as
select d::date as day,
  (select count(*) from diagnosis_leads where created_at::date = d::date) as diagnoses,
  (select count(*) from consult_interest where created_at::date = d::date) as consult_requests,
  (select count(*) from subscribers where created_at::date = d::date) as signups
from generate_series((select min(created_at) from diagnosis_leads)::date, current_date, '1 day') d;

-- ===== 006_legal.sql =====
-- 法的リスク対策（2026-10-22）。005_demo.sql の後に実行してください。
-- 1) Google の評価・口コミ件数を保存しない（Google Maps Platform 規約で保存できるのは place_id 等だけ）
-- 2) 相談1件ごとの課金をやめる（療担規則 2条の4の2「患者紹介の対価」にあたるおそれ）
-- 3) 医院からの「情報修正・掲載停止」の依頼を受け付ける

alter table public.clinics
  drop column if exists rating,
  drop column if exists review_count,
  drop column if exists rating_updated_at;

-- 料金の出典と確認日を医院ページに出す
alter table public.clinic_treatments
  add column if not exists source_url  text,
  add column if not exists updated_at  timestamptz not null default now();

-- オンライン相談の受付は無料のみ（月額のPR枠は sponsorships で別管理）
alter table public.clinic_partners drop constraint if exists clinic_partners_plan_check;
update public.clinic_partners set plan = 'free', lead_price = 0 where plan = 'per_lead';
alter table public.clinic_partners
  alter column plan set default 'free',
  alter column lead_price set default 0,
  add constraint clinic_partners_plan_check check (plan in ('free'));

create table if not exists public.clinic_change_requests (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid references public.clinics(id) on delete set null,
  clinic_name    text not null,
  kind           text not null check (kind in ('correct', 'remove')),
  requester      text not null,
  contact_email  text not null,
  message        text not null default '',
  status         text not null default 'open' check (status in ('open', 'done', 'rejected')),
  created_at     timestamptz not null default now()
);
create index if not exists clinic_change_requests_open_idx on public.clinic_change_requests (created_at desc) where status = 'open';
alter table public.clinic_change_requests enable row level security;  -- service_role のみ読み書き

-- ===== 007_real_clinics.sql =====
-- 実在の医院（渋谷・ホワイトニングと矯正）と、本番運用のための列の追加。scripts/generate-real-seed.ts で生成。
-- 006_legal.sql の後に実行してください。何度流しても同じ結果になります。
begin;

alter table public.clinics add column if not exists address text;            -- 公式サイト記載の所在地
alter table public.clinic_treatments add column if not exists price_note text; -- 税表記なし・検査料別などの注記
alter table public.station_research add column if not exists exhausted_at timestamptz; -- 新しい医院が見つからなくなった日（次の駅へ進む）
create index if not exists clinics_created_auto_idx on public.clinics (created_at) where source = 'auto_research';

-- テスト公開用の架空医院は本番では出さない
update public.clinics set is_published = false where id::text like '00000000-0000-4000-8000-%';

insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000001', 'shibuya-haplus-dental', 'shibuya', '渋谷ハプラス歯科', '東京都渋谷区神南1-23-13 丸大ビル8階', '東京都', '渋谷区', '渋谷駅', 3, '{access,weekend}', '平日・土曜は21時まで診療。ホワイトニングと表側・裏側・部分矯正に対応', 'https://www.haplus-shibuya.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000001', 'whitening', 'whitening_office', 31900, 31900, '1クール（1回約90分）', 0, 'https://www.haplus-shibuya.com/treatment/aesthetic-dentistry/whitening/', '1クールの料金。白さによっては複数回必要', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000001', 'whitening', 'whitening_home', 36300, 36300, '2〜6週間', 0, 'https://www.haplus-shibuya.com/treatment/aesthetic-dentistry/whitening/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000001', 'orthodontics', 'ortho_wire', 748000, 748000, '1年半〜3年程度', 0, 'https://www.haplus-shibuya.com/treatment/ortho/wire/', '初回検査11,000円・調整料5,500円/回は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000001', 'orthodontics', 'ortho_lingual', 1210000, 1210000, '1年半〜3年程度', 0, 'https://www.haplus-shibuya.com/treatment/ortho/wire/', '初回検査11,000円・調整料5,500円/回は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000001', 'orthodontics', 'ortho_partial', 550000, 550000, '3ヶ月〜1年程度', 0, 'https://www.haplus-shibuya.com/treatment/ortho/wire/', '初回検査11,000円・調整料5,500円/回は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000002', 'shibuya-shika-jinnan', 'shibuya', '渋谷歯科', '東京都渋谷区神南1-22-8 渋谷東栄ビル9階', '東京都', '渋谷区', '渋谷駅', 3, '{price,access,weekend}', 'オフィスホワイトニングは1回と3回セットから選べる。土日も19時まで診療', 'https://www.shibuya-shinbi.jp/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000002', 'whitening', 'whitening_office', 4400, 9900, '1回〜3回セット', 0, 'https://www.shibuya-shinbi.jp/whitening-treatment/', '1回4,400円・3回セット9,900円', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000002', 'whitening', 'whitening_home', 13200, 13200, 'ジェル2本付き', 0, 'https://www.shibuya-shinbi.jp/whitening-treatment/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000003', 'shibuya-miyamasuzaka-dental', 'shibuya', '渋谷宮益坂歯科', '東京都渋谷区渋谷1-14-9 藤和宮益坂ビル6F', '東京都', '渋谷区', '渋谷駅', 1, '{price,access,weekend}', '渋谷駅東口から徒歩1分。土日も診療（祝日休診）', 'https://www.shika-tanaka.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000003', 'whitening', 'whitening_office', 4400, 4400, '1回（1日最大3回）', 0, 'https://www.shika-tanaka.com/about-whitening/', '1回あたりの料金', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000003', 'whitening', 'whitening_home', 13200, 13200, 'マウスピースとジェル2本', 0, 'https://www.shika-tanaka.com/about-whitening/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000004', 'sakura-platinum-dental', 'shibuya', 'さくらプラチナム歯科', '東京都渋谷区渋谷2-22-13 渋谷東口マイアミビル5F・6F', '東京都', '渋谷区', '渋谷駅', 1, '{price,access,weekend}', '年中無休で深夜まで診療。照射回数ごとに選べるホワイトニングプラン', 'https://www.sakurashika24-3.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000004', 'whitening', 'whitening_office', 2200, 33000, '1回8分の照射から（プランにより異なる）', 0, 'https://www.sakurashika24-3.com/office-whitening', '最安は8分×1回。回数・痛みに配慮したプランで料金が変わる', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000004', 'whitening', 'whitening_dual', 50700, 103000, 'コースにより異なる', 0, 'https://www.sakurashika24-3.com/dual-whitening', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000005', 'my-dental-clinic-shibuya', 'shibuya', 'MYデンタルクリニック渋谷', '東京都渋谷区宇田川町36-1 SANWA SHIBUYA Bldg. 3F', '東京都', '渋谷区', '渋谷駅', 6, '{weekend}', '10時〜21時診療。オフィスホワイトニングは続けて通うと2回目以降の料金が下がる', 'https://mydec.jp/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000005', 'whitening', 'whitening_office', 11000, 22000, '1回90分（継続プラン）', 0, 'https://mydec.jp/whitening/', '初回22,000円、2回目16,500円、3回目以降11,000円', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000005', 'whitening', 'whitening_home', 33000, 33000, '1回', 0, 'https://mydec.jp/whitening/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000005', 'whitening', 'whitening_dual', 44000, 44000, '1回', 0, 'https://mydec.jp/whitening/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000006', 'shibuya-ohno-dental', 'shibuya', '渋谷おおの歯科・矯正歯科', '東京都渋谷区渋谷3-18-8 大野ビル4階', '東京都', '渋谷区', '渋谷駅', 1, '{access,weekend}', '渋谷駅C2出口から徒歩1分。平日は21時まで、土曜も診療', 'https://shibuya-ohno-dental.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000006', 'whitening', 'whitening_office', 19800, 22000, '1回', 0, 'https://shibuya-ohno-dental.com/price/', '薬剤（ティオン／オパールエッセンス）で料金が変わる', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000006', 'whitening', 'whitening_dual', 39800, 39800, 'オフィス＋ホーム', 0, 'https://shibuya-ohno-dental.com/price/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000006', 'orthodontics', 'ortho_aligner', 660000, 1155000, '記載なし', 0, 'https://shibuya-ohno-dental.com/price/', 'インビザライン・エンジェルアライナー。精密検査・診断料33,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000006', 'orthodontics', 'ortho_wire', 990000, 1100000, '記載なし', 0, 'https://shibuya-ohno-dental.com/price/', '調整料・保定装置込み。精密検査・診断料33,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000006', 'orthodontics', 'ortho_lingual', 1375000, 1870000, '記載なし', 0, 'https://shibuya-ohno-dental.com/price/', 'ハーフ〜フルリンガル。精密検査・診断料33,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000007', 'shibuya-fb-kyousei', 'shibuya', '渋谷F&B矯正歯科・東京', '東京都渋谷区松濤1-29-1 渋谷クロスロードビル5F', '東京都', '渋谷区', '渋谷駅', 5, '{weekend}', '調整料・保定料込みのトータルフィー制。月曜〜日曜に診療（不定休）', 'https://fb-kyousei.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000007', 'orthodontics', 'ortho_aligner', 330000, 880000, '記載なし', 0, 'https://fb-kyousei.com/cost/', 'インビザライン・ハナラビのプランで異なる。精密検査3,300円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000007', 'orthodontics', 'ortho_wire', 902000, 902000, '記載なし', 0, 'https://fb-kyousei.com/cost/', 'クリアブラケット・ホワイトワイヤー。精密検査3,300円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000007', 'orthodontics', 'ortho_lingual', 1210000, 1408000, '記載なし', 0, 'https://fb-kyousei.com/cost/', 'ハーフ〜フルリンガル。精密検査3,300円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000007', 'orthodontics', 'ortho_partial', 165000, 495000, '記載なし', 0, 'https://fb-kyousei.com/cost/', '症状・装置による', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000007', 'whitening', 'whitening_office', 16500, 16500, '1回', 0, 'https://fb-kyousei.com/cost/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000007', 'whitening', 'whitening_home', 33000, 33000, '上下トレー', 0, 'https://fb-kyousei.com/cost/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000008', 'shibuya-central-kyousei', 'shibuya', '渋谷セントラル矯正歯科', '東京都渋谷区宇田川町33-1 グランド東京渋谷7F', '東京都', '渋谷区', '渋谷駅', 5, '{weekend}', '難易度別の料金と治療期間の目安を公開。平日は20時半まで、日曜も診療', 'https://kireiha.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000008', 'orthodontics', 'ortho_wire', 890000, 1040000, '9ヶ月〜30ヶ月', 0, 'https://kireiha.com/price/', '難易度A〜Fで異なる。検査・診断50,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000008', 'orthodontics', 'ortho_lingual', 1060000, 1470000, '9ヶ月〜30ヶ月', 0, 'https://kireiha.com/price/', 'ハーフ〜フルリンガル。検査・診断50,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000008', 'orthodontics', 'ortho_aligner', 270000, 800000, '記載なし', 0, 'https://kireiha.com/price/', 'インビザラインのプランで異なる。検査・診断50,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000008', 'orthodontics', 'ortho_partial', 420000, 820000, '5ヶ月〜14ヶ月', 0, 'https://kireiha.com/price/', '裏側の部分矯正。検査・診断50,000円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000009', 'shibuya-miyashita-park-dental', 'shibuya', '渋谷宮下パーク歯科・矯正歯科', '東京都渋谷区渋谷1-24-7 宮下パークビル2F', '東京都', '渋谷区', '渋谷駅', 1, '{access,weekend}', '渋谷駅から徒歩1分。土日も診療。矯正とホワイトニングの料金表を公開', 'https://sm-dc.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'orthodontics', 'ortho_aligner', 330000, 990000, '記載なし', 0, 'https://sm-dc.com/fee/', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています。2026年8月に一部料金を改定と記載あり', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'orthodontics', 'ortho_wire', 770000, 990000, '記載なし', 0, 'https://sm-dc.com/fee/', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'orthodontics', 'ortho_lingual', 1100000, 1330000, '記載なし', 0, 'https://sm-dc.com/fee/', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'orthodontics', 'ortho_partial', 248000, 348000, '記載なし', 0, 'https://sm-dc.com/fee/', '片顎の料金。公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'whitening', 'whitening_office', 25000, 25000, '記載なし', 0, 'https://sm-dc.com/fee/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'whitening', 'whitening_home', 27500, 27500, 'トレー＋ジェル', 0, 'https://sm-dc.com/fee/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000009', 'whitening', 'whitening_dual', 48000, 48000, '記載なし', 0, 'https://sm-dc.com/fee/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000010', 'shibuya-dogenzaka-kyousei', 'shibuya', '渋谷道玄坂矯正歯科', '東京都渋谷区道玄坂2-6-15 鈴井ビル6階', '東京都', '渋谷区', '渋谷駅', 3, '{access}', '矯正歯科。表側・裏側・マウスピース・部分矯正の料金を公開', 'https://www.shibuya-dogenzaka-kyousei.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000010', 'orthodontics', 'ortho_wire', 825000, 990000, '約24〜30ヶ月', 0, 'https://www.shibuya-dogenzaka-kyousei.com/price/', '税込表記。別の箇所に「別途消費税」の記載もあるため要確認。精密検査16,500円・調整料5,500円/月は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000010', 'orthodontics', 'ortho_lingual', 1210000, 1320000, '約24〜30ヶ月', 0, 'https://www.shibuya-dogenzaka-kyousei.com/price/', 'ハーフ〜フルリンガル。精密検査16,500円・調整料5,500円/月は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000010', 'orthodontics', 'ortho_aligner', 990000, 990000, '記載なし', 0, 'https://www.shibuya-dogenzaka-kyousei.com/price/', '精密検査16,500円・調整料5,500円/月は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000010', 'orthodontics', 'ortho_partial', 440000, 440000, '記載なし', 0, 'https://www.shibuya-dogenzaka-kyousei.com/price/', null, '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000011', 'cs-kyousei-clinic', 'shibuya', 'CS矯正歯科クリニック', '東京都渋谷区宇田川町42-4 ワイリービル4F・5F', '東京都', '渋谷区', '渋谷駅', 8, '{female_doctor,weekend}', '女性医師が担当する矯正歯科（公式サイト記載）。土曜も診療・完全予約制', 'https://www.cskyousei.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000011', 'orthodontics', 'ortho_wire', 500000, 1190000, '1〜3年（永久歯列）', 0, 'https://www.cskyousei.com/orthodontics', 'メタル〜ジルコニア装置。公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000011', 'orthodontics', 'ortho_lingual', 1380000, 1904000, '1〜3年（永久歯列）', 0, 'https://www.cskyousei.com/orthodontics', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000011', 'orthodontics', 'ortho_aligner', 830000, 1099000, '1〜3年（永久歯列）', 0, 'https://www.cskyousei.com/orthodontics', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000012', 'shibuya-dd-dental', 'shibuya', '渋谷DDデンタルクリニック', '東京都渋谷区道玄坂1-16-7 ハイウェービル7F', '東京都', '渋谷区', '渋谷駅', 5, '{weekend}', '公式サイトの診療表では土日祝も診療。審美ワイヤー矯正とハーフリンガルに対応', 'https://dd-dentalclinic.jp/clinic/shibuyadental/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000012', 'orthodontics', 'ortho_wire', 657800, 701800, '1年半〜3年程度', 0, 'https://dd-dentalclinic.jp/clinic/shibuyadental/wire', 'クリアブラケット。再診料5,500円/回は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000012', 'orthodontics', 'ortho_lingual', 767800, 767800, '記載なし', 0, 'https://dd-dentalclinic.jp/clinic/shibuyadental/wire', 'ハーフリンガル（上が裏側・下が表側）。再診料5,500円/回は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000013', 'shibuya-louvre-dental', 'shibuya', '渋谷ルーブル歯科・矯正歯科', '東京都渋谷区神南1-20-17 BC神南PROPERTY 6F', '東京都', '渋谷区', '渋谷駅', 3, '{access,weekend}', 'マウスピース・表側・裏側・部分矯正の総額を公開。土日も診療', 'https://www.shibuya-louvre-dental.com/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000013', 'orthodontics', 'ortho_aligner', 770000, 880000, '記載なし', 0, 'https://www.shibuya-louvre-dental.com/', 'インビザラインの装置代総額', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000013', 'orthodontics', 'ortho_wire', 660000, 770000, '記載なし', 0, 'https://www.shibuya-louvre-dental.com/', '装置代総額', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000013', 'orthodontics', 'ortho_lingual', 990000, 990000, '記載なし', 0, 'https://www.shibuya-louvre-dental.com/', '装置代総額', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000013', 'orthodontics', 'ortho_partial', 110000, 550000, '記載なし', 0, 'https://www.shibuya-louvre-dental.com/', '範囲により異なる', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000014', 'smile-access-shibuya', 'shibuya', 'スマイルアクセス矯正歯科 渋谷', '東京都渋谷区渋谷1-8-6 VORT渋谷宮益坂2F', '東京都', '渋谷区', '渋谷駅', 3, '{access,weekend}', 'マウスピース矯正を症状の程度別の料金で案内。日曜も診療（金・土休診）', 'https://smile-access.com/clinic/shibuya/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000014', 'orthodontics', 'ortho_aligner', 715000, 935000, '約6ヶ月〜2年以上', 0, 'https://smile-access.com/clinic/shibuya/', '精密検査38,500円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000014', 'orthodontics', 'ortho_partial', 165000, 550000, '約6ヶ月', 0, 'https://smile-access.com/clinic/shibuya/', 'ワイヤー・マウスピースの部分矯正。精密検査38,500円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000014', 'orthodontics', 'ortho_wire', 880000, 935000, '約1年〜2年以上', 0, 'https://smile-access.com/clinic/shibuya/', '精密検査38,500円は別', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000015', 'shibuya-star-dental', 'shibuya', '渋谷スター歯科', '東京都渋谷区渋谷1-24-15 ヒューリック渋谷宮益坂ビル6F', '東京都', '渋谷区', '渋谷駅', 1, '{price,access}', '渋谷駅から徒歩1分。LEDライトのオフィスホワイトニングを照射回数別に案内', 'https://starwhitening.net/shibuya/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000015', 'whitening', 'whitening_office', 2950, 7228, '1〜3回（10分照射）', 0, 'https://starwhitening.net/shibuya/', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinics (id, slug, station_slug, name, address, prefecture, city, nearest_station, walk_minutes, features, catch_copy, website_url, source, researched_at, is_published) values ('10000000-0000-4000-8000-000000000016', 'oral-proportion-clinic', 'shibuya', 'オーラルプロポーションクリニック', '東京都渋谷区渋谷1-23-18 渋谷ワールドイーストビル8F', '東京都', '渋谷区', '渋谷駅', 4, '{access}', '自費診療のみの完全予約制。東京メトロ渋谷駅B1出口から徒歩1分', 'https://www.oralpro.jp/', 'manual', '2026-10-26T00:00:00+09:00', true) on conflict (id) do update set name = excluded.name, address = excluded.address, walk_minutes = excluded.walk_minutes, features = excluded.features, catch_copy = excluded.catch_copy, website_url = excluded.website_url, researched_at = excluded.researched_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000016', 'whitening', 'whitening_office', 38500, 38500, '記載なし', 0, 'https://www.oralpro.jp/price/', '公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000016', 'whitening', 'whitening_home', 20000, 20000, 'マウスピース上下', 0, 'https://www.oralpro.jp/price/', 'ジェルは別。公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000016', 'orthodontics', 'ortho_aligner', 484000, 1155000, '記載なし', 0, 'https://www.oralpro.jp/price/', 'インビザライン。検査・診断33,000円は別。公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000016', 'orthodontics', 'ortho_wire', 990000, 990000, '記載なし', 0, 'https://www.oralpro.jp/price/', '検査・診断33,000円は別。公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;
insert into public.clinic_treatments (clinic_id, category, option_code, price_min, price_max, duration_label, cases_count, source_url, price_note, updated_at) values ('10000000-0000-4000-8000-000000000016', 'orthodontics', 'ortho_lingual', 1320000, 1320000, '記載なし', 0, 'https://www.oralpro.jp/price/', '検査・診断33,000円は別。公式サイトに税込・税抜の記載がないため、記載額をそのまま載せています', '2026-10-26T00:00:00+09:00') on conflict (clinic_id, option_code) do update set price_min = excluded.price_min, price_max = excluded.price_max, duration_label = excluded.duration_label, source_url = excluded.source_url, price_note = excluded.price_note, updated_at = excluded.updated_at;

commit;

-- ===== 008_community.sql =====
-- みんなの記録（体験記録）と質問ひろば
-- 投稿はログインなしで受け付け、機械チェックを通ったものだけ公開する（通らなければ status = 'pending' で管理画面へ）
-- 医院名・個人を特定できる情報・写真は受け付けない。医院ページとはつなげず、医院の順位にも使わない。
-- 書き込みはすべて API（service role）経由。匿名キーからは公開済みの行を読むことだけ許す。

create table if not exists community_experiences (
  id uuid primary key default gen_random_uuid(),
  option_code text not null,                 -- clinic_treatments.option_code と同じ値（whitening_office, ortho_wire など）
  total_paid integer not null check (total_paid between 1000 and 5000000), -- 実際に払った総額（円）
  months integer check (months between 0 and 120),                        -- かかった期間（0 = 1回だけ）
  pain smallint check (pain between 1 and 5),
  satisfaction smallint not null check (satisfaction between 1 and 5),
  choose_again text check (choose_again in ('yes', 'maybe', 'no')),
  age_band text,
  good text check (char_length(good) <= 300),
  regret text check (char_length(regret) <= 300),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  flags text[] not null default '{}',        -- 機械チェックで引っかかった理由
  ip_hash text,                              -- 連投防止用（IP アドレスそのものは保存しない）
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists community_experiences_list on community_experiences (status, option_code, created_at desc);

create table if not exists community_questions (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('care', 'cost', 'choice', 'other')),
  option_code text,
  title text not null check (char_length(title) between 5 and 80),
  body text not null default '' check (char_length(body) <= 600),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  flags text[] not null default '{}',
  ip_hash text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists community_questions_list on community_questions (status, created_at desc);

create table if not exists community_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references community_questions(id) on delete cascade,
  is_expert boolean not null default false,  -- 管理画面から書いた専門家の回答だけ true
  expert_role text check (expert_role in ('dental_hygienist', 'dentist')),
  author_label text not null,                -- 「ちえみ」「治療中・30代」など。本名は求めない
  body text not null check (char_length(body) between 5 and 800),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  flags text[] not null default '{}',
  ip_hash text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists community_answers_by_question on community_answers (question_id, status, created_at);

-- 「参考になった」「同じ悩み」。同じ人（IP ハッシュ）は1回だけ
create table if not exists community_reactions (
  id bigint generated always as identity primary key,
  experience_id uuid references community_experiences(id) on delete cascade,
  question_id uuid references community_questions(id) on delete cascade,
  answer_id uuid references community_answers(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(experience_id, question_id, answer_id) = 1)
);
create unique index if not exists community_reactions_once on community_reactions
  (coalesce(experience_id, question_id, answer_id), ip_hash);

alter table community_experiences enable row level security;
alter table community_questions enable row level security;
alter table community_answers enable row level security;
alter table community_reactions enable row level security;

drop policy if exists "published experiences are public" on community_experiences;
create policy "published experiences are public" on community_experiences for select using (status = 'published');
drop policy if exists "published questions are public" on community_questions;
create policy "published questions are public" on community_questions for select using (status = 'published');
drop policy if exists "published answers are public" on community_answers;
create policy "published answers are public" on community_answers for select using (status = 'published');
