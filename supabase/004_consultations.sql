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
