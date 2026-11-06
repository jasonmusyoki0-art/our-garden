-- 💬🏆 Run this ONCE if you already set up Supabase before Chat and the Scoreboard existed.
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- CHANGE the email (2 places per table, 4 places in total) to match "sharedEmail" in js/config.js,
-- exactly like you did in setup.sql. (Default shown: garden@ourlittleworld.app)

create table if not exists public.messages (
  id uuid primary key,
  created_at timestamptz not null default now(),
  author text, text text
);
create table if not exists public.results (
  id uuid primary key,
  created_at timestamptz not null default now(),
  game text, mode text, level int, winner text, author text, detail text
);

alter table public.messages enable row level security;
alter table public.results  enable row level security;

drop policy if exists "only_us" on public.messages;
create policy "only_us" on public.messages for all to authenticated
  using ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app')
  with check ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app');

drop policy if exists "only_us" on public.results;
create policy "only_us" on public.results for all to authenticated
  using ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app')
  with check ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app');
