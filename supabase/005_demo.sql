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
