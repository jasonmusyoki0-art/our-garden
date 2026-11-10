-- ============================================================
-- 🌸 OUR GARDEN: chat upgrade (replies + reactions)
-- Run ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run twice. (New installs don't need it: setup.sql already has it.)
-- ============================================================
alter table public.messages add column if not exists reply_to uuid;
alter table public.messages add column if not exists reactions jsonb not null default '{}'::jsonb;
