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
