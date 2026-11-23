-- 0022: "Import from GitHub" (Crawler GitHub App). One row per (person, installation).
-- Rows are written ONLY by the server after GitHub confirmed the installation belongs to that person
-- (src/app/api/github/setup). People can read and remove their own rows, never add them, so nobody
-- can attach someone else's installation id to their account.
create table if not exists public.github_installations (
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id bigint not null,
  account_login text not null check (char_length(account_login) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, installation_id)
);
alter table public.github_installations enable row level security;
drop policy if exists "github: read own" on public.github_installations;
create policy "github: read own" on public.github_installations for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "github: remove own" on public.github_installations;
create policy "github: remove own" on public.github_installations for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.github_installations from anon;
revoke insert, update on public.github_installations from authenticated;
grant select, delete on public.github_installations to authenticated;
