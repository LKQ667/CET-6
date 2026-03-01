create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  email text unique,
  target_score integer not null default 500,
  prep_start_date date not null default '2026-03-01',
  prep_end_date date not null default '2026-12-11',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scores_baseline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  total_score integer not null,
  listening_score integer not null,
  reading_score integer not null,
  writing_translation_score integer not null,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.daily_tasks (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  task_date date not null,
  task_type text not null check (task_type in ('vocab', 'listening', 'writing_translation', 'reading')),
  title text not null,
  description text not null,
  estimated_minutes integer not null check (estimated_minutes > 0),
  completed boolean not null default false,
  phase_code text not null check (phase_code in ('A', 'B', 'C', 'D')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_daily_tasks_user_date on public.daily_tasks(user_id, task_date);

create table if not exists public.vocab_entries (
  id uuid primary key default gen_random_uuid(),
  lemma text not null unique,
  phonetic text,
  pos text,
  meaning_zh text not null,
  frequency_in_papers integer not null default 1,
  is_verified boolean not null default false,
  verification_status text not null check (verification_status in ('public_source', 'user_uploaded', 'pending_review')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocab_provenance (
  id uuid primary key default gen_random_uuid(),
  vocab_entry_id uuid not null references public.vocab_entries(id) on delete cascade,
  exam_year integer not null check (exam_year between 2000 and 2100),
  exam_month integer not null check (exam_month in (6, 12)),
  paper_code text not null,
  question_type text not null,
  source_url text not null,
  source_snippet text not null,
  source_file text,
  created_at timestamptz not null default now()
);
create index if not exists idx_vocab_provenance_vocab on public.vocab_provenance(vocab_entry_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  raw_subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  reminder_times text[] not null default array['12:00', '21:40'],
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  level integer not null default 1 check (level >= 1),
  exp integer not null default 0 check (exp >= 0),
  coins integer not null default 0 check (coins >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  exp_gained integer not null default 0 check (exp_gained >= 0),
  coins_gained integer not null default 0 check (coins_gained >= 0),
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  boss_defeated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.builtin_resources (
  id text primary key,
  title text not null,
  description text,
  file_name text not null,
  public_path text not null,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  uploaded_at timestamptz not null default now(),
  parse_status text not null default 'uploaded' check (parse_status in ('uploaded', 'parsed', 'failed')),
  parsed_at timestamptz,
  content_text text,
  source_file text,
  file_hash text
);
alter table public.source_uploads add column if not exists source_file text;
alter table public.source_uploads add column if not exists file_hash text;
create index if not exists idx_source_uploads_user_uploaded_at on public.source_uploads(user_id, uploaded_at desc);
create unique index if not exists uniq_source_uploads_source_hash
on public.source_uploads(user_id, source_file, file_hash)
where source_file is not null and file_hash is not null;

create table if not exists public.source_extracted_candidates (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.source_uploads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  lemma text not null,
  frequency integer not null default 1,
  context_snippet text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_source_candidates_upload on public.source_extracted_candidates(upload_id);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  event_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists uniq_activity_user_key on public.activity_logs(user_id, event_type, event_key);

alter table public.users enable row level security;
alter table public.scores_baseline enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.vocab_entries enable row level security;
alter table public.vocab_provenance enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.game_profiles enable row level security;
alter table public.game_daily_logs enable row level security;
alter table public.builtin_resources enable row level security;
alter table public.source_uploads enable row level security;
alter table public.source_extracted_candidates enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "user_can_select_own_profile" on public.users;
create policy "user_can_select_own_profile" on public.users for select using (auth.uid() = id);
drop policy if exists "user_can_update_own_profile" on public.users;
create policy "user_can_update_own_profile" on public.users for update using (auth.uid() = id);

drop policy if exists "user_can_manage_own_scores" on public.scores_baseline;
create policy "user_can_manage_own_scores" on public.scores_baseline for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_can_manage_own_tasks" on public.daily_tasks;
create policy "user_can_manage_own_tasks" on public.daily_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public_read_verified_vocab" on public.vocab_entries;
create policy "public_read_verified_vocab" on public.vocab_entries for select using (is_verified = true);

drop policy if exists "public_read_vocab_provenance" on public.vocab_provenance;
create policy "public_read_vocab_provenance" on public.vocab_provenance for select using (true);

drop policy if exists "user_can_manage_own_push" on public.push_subscriptions;
create policy "user_can_manage_own_push" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_can_manage_own_reminder_pref" on public.reminder_preferences;
create policy "user_can_manage_own_reminder_pref" on public.reminder_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_can_manage_own_game_profile" on public.game_profiles;
create policy "user_can_manage_own_game_profile" on public.game_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_can_manage_own_game_logs" on public.game_daily_logs;
create policy "user_can_manage_own_game_logs" on public.game_daily_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_can_read_builtin_resources" on public.builtin_resources;
create policy "users_can_read_builtin_resources" on public.builtin_resources for select using (is_active = true);

drop policy if exists "user_can_manage_own_uploads" on public.source_uploads;
create policy "user_can_manage_own_uploads" on public.source_uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_can_manage_own_candidates" on public.source_extracted_candidates;
create policy "user_can_manage_own_candidates" on public.source_extracted_candidates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_can_read_own_logs" on public.activity_logs;
create policy "user_can_read_own_logs" on public.activity_logs for select using (auth.uid() = user_id);

create or replace function public.ensure_vocab_provenance()
returns trigger
language plpgsql
as $$
begin
  if new.is_verified = true then
    if not exists (select 1 from public.vocab_provenance vp where vp.vocab_entry_id = new.id) then
      raise exception 'verified vocab must have provenance';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vocab_verified_requires_provenance on public.vocab_entries;
create trigger trg_vocab_verified_requires_provenance
after insert or update on public.vocab_entries
for each row
execute function public.ensure_vocab_provenance();

-- ========== 题库系统 ==========

create table if not exists public.question_bank (
  id text primary key,
  task_type text not null check (task_type in ('vocab', 'listening', 'writing_translation', 'reading')),
  content jsonb not null,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_question_bank_type on public.question_bank(task_type);

create table if not exists public.user_question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  question_id text not null references public.question_bank(id) on delete cascade,
  answered_count integer not null default 1 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  last_answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);
create index if not exists idx_user_question_progress_user on public.user_question_progress(user_id, last_answered_at);

alter table public.question_bank enable row level security;
alter table public.user_question_progress enable row level security;

drop policy if exists "anyone_can_read_active_questions" on public.question_bank;
create policy "anyone_can_read_active_questions" on public.question_bank for select using (is_active = true);

drop policy if exists "user_can_manage_own_question_progress" on public.user_question_progress;
create policy "user_can_manage_own_question_progress" on public.user_question_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
