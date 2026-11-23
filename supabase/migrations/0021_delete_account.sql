-- 0021: "Delete my account" from Settings (2026-11-23 overhaul).
-- What it does: deletes the person's login; everything tied to it (tests, crawls, saved audiences,
-- messages, fix status, answers...) goes with it through ON DELETE CASCADE. Stored screenshots are
-- removed by the web route right after this succeeds.
-- What it keeps: ONLY a one-way hash of the email address (deleted_accounts), so deleting and
-- re-signing up can't be used to get another free test. The hash can't be turned back into the email.
-- Safety: refuses while a paid plan is active (cancel first, so nobody keeps being charged).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.deleted_accounts (
  email_hash text primary key,
  deleted_at timestamptz not null default now()
);
alter table public.deleted_accounts enable row level security; -- no policies: nobody reads it from a browser
revoke all on public.deleted_accounts from anon, authenticated;

create or replace function public.email_hash(p_email text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(lower(trim(coalesce(p_email, ''))), 'sha256'), 'hex')
$$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_email text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if exists (select 1 from public.subscriptions where user_id = v_user and status in ('active', 'trialing', 'past_due') and not cancel_at_period_end) then
    raise exception 'Cancel your plan in Manage billing first, then delete your account.';
  end if;
  select email into v_email from auth.users where id = v_user;
  if v_email is not null then
    insert into public.deleted_accounts (email_hash) values (public.email_hash(v_email)) on conflict (email_hash) do update set deleted_at = now();
  end if;
  delete from auth.users where id = v_user;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- New sign-ups: same as before (a profile row), but an email that deleted an account before
-- starts with its free test already used (bonus_tests = -1 cancels the 1 free test).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, bonus_tests)
  values (new.id, case when exists (select 1 from public.deleted_accounts where email_hash = public.email_hash(new.email)) then -1 else 0 end)
  on conflict do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
