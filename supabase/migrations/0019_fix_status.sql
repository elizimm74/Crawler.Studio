-- 0019: track each recommended fix: not started / in progress / completed (2026-11-23 overhaul).
-- One row per (test, fix). Only the owner of the test can read or change its rows (RLS).
-- fix_key is the fix's title (trimmed, max 200 chars), so it survives re-renders of the report.
create table if not exists public.fix_status (
  test_id text not null references public.tests(id) on delete cascade,
  fix_key text not null check (char_length(fix_key) between 1 and 200),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('not_started', 'in_progress', 'completed')),
  updated_at timestamptz not null default now(),
  primary key (test_id, fix_key)
);
create index if not exists fix_status_user on public.fix_status (user_id);

alter table public.fix_status enable row level security;

drop policy if exists "fix_status: read own" on public.fix_status;
create policy "fix_status: read own" on public.fix_status
  for select to authenticated using (user_id = (select auth.uid()));

-- Write only for YOUR OWN tests (the test row must belong to you too).
drop policy if exists "fix_status: insert own" on public.fix_status;
create policy "fix_status: insert own" on public.fix_status
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.tests t where t.id = test_id and t.user_id = (select auth.uid())));

drop policy if exists "fix_status: update own" on public.fix_status;
create policy "fix_status: update own" on public.fix_status
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.tests t where t.id = test_id and t.user_id = (select auth.uid())));

drop policy if exists "fix_status: delete own" on public.fix_status;
create policy "fix_status: delete own" on public.fix_status
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.fix_status from anon;
grant select, insert, update, delete on public.fix_status to authenticated;
