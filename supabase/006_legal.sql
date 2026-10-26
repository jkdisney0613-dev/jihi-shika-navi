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
