-- 📅 Run this ONCE if you already ran setup.sql before the Calendar existed.
-- Change the email (2 places) to match js/config.js, same as in setup.sql.
create table if not exists public.events (
  id uuid primary key,
  created_at timestamptz not null default now(),
  day text, title text, time text, kind text, note text, author text, done boolean default false
);
alter table public.events enable row level security;
drop policy if exists "only_us" on public.events;
create policy "only_us" on public.events for all to authenticated
  using ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app')
  with check ((auth.jwt() ->> 'email') = 'garden@ourlittleworld.app');
