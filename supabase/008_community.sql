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
