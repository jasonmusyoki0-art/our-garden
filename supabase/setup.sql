-- ============================================================
-- 🌸 OUR GARDEN: database setup (run ONCE in Supabase)
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--
-- BEFORE YOU RUN IT: change the email on the line marked  <<< CHANGE
-- so it is EXACTLY the same as "sharedEmail" in js/config.js.
-- Only that one account can ever read or write anything.
-- ============================================================

-- 1) Tables --------------------------------------------------
create table if not exists public.kv (
  key text primary key,
  value jsonb
);

create table if not exists public.answers (
  id uuid primary key,
  created_at timestamptz not null default now(),
  kind text, qid text, qtext text, author text, text text, day text
);

create table if not exists public.letters (
  id uuid primary key,
  created_at timestamptz not null default now(),
  kind text, author text, title text, body text, unlock_on date
);

create table if not exists public.albums (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text, emoji text, auto text, author text
);

create table if not exists public.media (
  id uuid primary key,
  created_at timestamptz not null default now(),
  album_id uuid, kind text, path text, thumb_path text, name text,
  mime text, caption text, author text, period text, size bigint
);

create table if not exists public.events (
  id uuid primary key,
  created_at timestamptz not null default now(),
  day text, title text, time text, kind text, note text, author text, done boolean default false
);

-- 2) Lock every table (Row Level Security) ---------------------
alter table public.kv      enable row level security;
alter table public.answers enable row level security;
alter table public.letters enable row level security;
alter table public.albums  enable row level security;
alter table public.media   enable row level security;
alter table public.events  enable row level security;

-- Only OUR login may do anything.  <<< CHANGE the email below (4 places in this file)
do $$
declare t text;
begin
  foreach t in array array['kv','answers','letters','albums','media','events'] loop
    execute format('drop policy if exists "only_us" on public.%I', t);
    execute format($p$create policy "only_us" on public.%I for all to authenticated
      using ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app')
      with check ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app')$p$, t);
  end loop;
end $$;

-- 3) Private storage bucket for photos, videos, voice notes -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('memories', 'memories', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "only_us_files" on storage.objects;
create policy "only_us_files" on storage.objects for all to authenticated
  using (bucket_id = 'memories' and (auth.jwt() ->> 'email') = 'garden@ourlittleworld.app')
  with check (bucket_id = 'memories' and (auth.jwt() ->> 'email') = 'garden@ourlittleworld.app');
