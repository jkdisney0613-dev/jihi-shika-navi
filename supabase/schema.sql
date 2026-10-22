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
