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
