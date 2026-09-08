-- Qwerty Learner Supabase schema
-- Run in Supabase Dashboard → SQL Editor (or: supabase db push)

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_wordbooks + wordbook_items
-- ---------------------------------------------------------------------------
create table if not exists public.user_wordbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  language text not null default 'en',
  language_category text not null default 'en',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_wordbooks_user_id_idx on public.user_wordbooks (user_id);

alter table public.user_wordbooks enable row level security;

create policy "user_wordbooks_select_own"
  on public.user_wordbooks for select
  using (auth.uid() = user_id);

create policy "user_wordbooks_insert_own"
  on public.user_wordbooks for insert
  with check (auth.uid() = user_id);

create policy "user_wordbooks_update_own"
  on public.user_wordbooks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_wordbooks_delete_own"
  on public.user_wordbooks for delete
  using (auth.uid() = user_id);

create table if not exists public.wordbook_items (
  id uuid primary key default gen_random_uuid(),
  wordbook_id uuid not null references public.user_wordbooks (id) on delete cascade,
  name text not null,
  trans jsonb not null default '[]'::jsonb,
  usphone text not null default '',
  ukphone text not null default '',
  notation text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists wordbook_items_wordbook_id_idx on public.wordbook_items (wordbook_id, sort_order);

alter table public.wordbook_items enable row level security;

create policy "wordbook_items_all_own"
  on public.wordbook_items for all
  using (
    exists (
      select 1
      from public.user_wordbooks wb
      where wb.id = wordbook_items.wordbook_id
        and wb.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_wordbooks wb
      where wb.id = wordbook_items.wordbook_id
        and wb.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- user_favorites + user_phrases
-- ---------------------------------------------------------------------------
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_name text not null,
  word_trans jsonb not null default '[]'::jsonb,
  word_usphone text not null default '',
  word_ukphone text not null default '',
  source_dict text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, word_name, source_dict)
);

create index if not exists user_favorites_user_id_idx on public.user_favorites (user_id, created_at desc);

alter table public.user_favorites enable row level security;

create policy "user_favorites_all_own"
  on public.user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.user_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content text not null,
  translation text not null default '',
  category text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists user_phrases_user_id_idx on public.user_phrases (user_id, created_at desc);

alter table public.user_phrases enable row level security;

create policy "user_phrases_all_own"
  on public.user_phrases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- word_submissions (Edge Function writes via service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.word_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trans jsonb not null default '[]'::jsonb,
  usphone text not null default '',
  ukphone text not null default '',
  notation text not null default '',
  type text not null check (type in ('word', 'phrase')),
  category text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists word_submissions_status_idx on public.word_submissions (status, created_at desc);

alter table public.word_submissions enable row level security;

create policy "word_submissions_select_authenticated"
  on public.word_submissions for select
  to authenticated
  using (true);

create policy "word_submissions_update_authenticated"
  on public.word_submissions for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- cloud practice records
-- ---------------------------------------------------------------------------
create table if not exists public.cloud_word_records (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  dict text not null,
  chapter integer not null,
  timing jsonb not null default '[]'::jsonb,
  wrong_count integer not null default 0,
  mistakes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cloud_word_records_user_created_idx
  on public.cloud_word_records (user_id, created_at desc);

alter table public.cloud_word_records enable row level security;

create policy "cloud_word_records_all_own"
  on public.cloud_word_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.cloud_chapter_records (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  dict text not null,
  chapter integer not null,
  time integer not null,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  word_count integer not null default 0,
  correct_word_indexes jsonb not null default '[]'::jsonb,
  word_number integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cloud_chapter_records_user_created_idx
  on public.cloud_chapter_records (user_id, created_at desc);

alter table public.cloud_chapter_records enable row level security;

create policy "cloud_chapter_records_all_own"
  on public.cloud_chapter_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- auth trigger: auto-create profile
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
