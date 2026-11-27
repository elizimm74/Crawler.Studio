-- 0027 LAUNCH OFFER + PUBLIC PROOF NUMBERS (2026-11-27, founder's conversion redesign:
-- "Launch week: first 100 signups get a free 1,000-customer test", and "a single line of proof under
-- the input once available (tests run, sites analyzed)").
--
-- LAUNCH OFFER: during launch week (Dec 5 00:00 - Dec 12 23:59 US Eastern), the first 100 accounts
-- with a VERIFIED email get 1,000 Crawlers (enough for one 1,000-customer test), added to the same
-- balance as pay-per-analysis Crawlers (never expire, website/store/app tests, no Ad Analysis).
--   * Granted when the email is verified (Apple/Google/GitHub sign-ins are verified at once; email
--     sign-ups when they click the link), so throwaway unverified emails can't take the spots.
--   * One per account, at most 100 ever (an advisory lock makes two sign-ups at the same instant
--     queue up, so it can't hand out 101).
--   * Not for an email that deleted an account before (deleted_accounts, 0021).
--   * Grants are logged in launch_grants; deleting an account keeps the row (user emptied), so a
--     deleted account never frees a spot.
-- KEEP IN SYNC with LAUNCH_OFFER in src/lib/plans.ts and the Terms page.

create table if not exists public.launch_grants (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  crawlers integer not null,
  granted_at timestamptz not null default now()
);
alter table public.launch_grants enable row level security; -- no policies: nobody reads it from a browser
revoke all on public.launch_grants from anon, authenticated;

create or replace function public.launch_offer_config() returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('start', '2026-12-05T05:00:00Z', 'end', '2026-12-13T05:00:00Z', 'spots', 100, 'crawlers', 1000)
$$;

create or replace function public.grant_launch_offer(p_user uuid, p_email text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := public.launch_offer_config();
  v_given integer;
begin
  if p_user is null then return false; end if;
  if now() < (c ->> 'start')::timestamptz or now() >= (c ->> 'end')::timestamptz then return false; end if;
  if p_email is not null and exists (select 1 from public.deleted_accounts where email_hash = public.email_hash(p_email)) then return false; end if;
  perform pg_advisory_xact_lock(hashtext('crawler-launch-offer'));
  if exists (select 1 from public.launch_grants where user_id = p_user) then return false; end if;
  select count(*) into v_given from public.launch_grants;
  if v_given >= (c ->> 'spots')::integer then return false; end if;
  insert into public.profiles (id) values (p_user) on conflict do nothing;
  insert into public.launch_grants (user_id, crawlers) values (p_user, (c ->> 'crawlers')::integer);
  update public.profiles set pack_crawlers = pack_crawlers + (c ->> 'crawlers')::integer where id = p_user;
  return true;
exception when others then
  return false; -- never let the offer break a sign-up
end $$;
revoke all on function public.grant_launch_offer(uuid, text) from public, anon, authenticated;

-- Fires when an account is created already verified, or when its email gets verified later.
create or replace function public.on_email_verified() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform public.grant_launch_offer(new.id, new.email);
  end if;
  return new;
end $$;
revoke all on function public.on_email_verified() from public, anon, authenticated;

-- "zz_" so it runs AFTER on_auth_user_created (which makes the profile row); triggers fire in name order.
drop trigger if exists zz_launch_offer_on_verify on auth.users;
create trigger zz_launch_offer_on_verify
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.on_email_verified();

-- Public: is the offer on, and how many spots are left? (counts only, nothing about anyone)
create or replace function public.launch_offer_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (select public.launch_offer_config() as c),
       g as (select count(*)::integer as n from public.launch_grants)
  select jsonb_build_object(
    'start', c.c ->> 'start', 'end', c.c ->> 'end',
    'spots', (c.c ->> 'spots')::integer, 'crawlers', (c.c ->> 'crawlers')::integer,
    'left', greatest(0, (c.c ->> 'spots')::integer - g.n),
    'active', now() >= (c.c ->> 'start')::timestamptz and now() < (c.c ->> 'end')::timestamptz and g.n < (c.c ->> 'spots')::integer)
  from c, g
$$;
revoke all on function public.launch_offer_status() from public;
grant execute on function public.launch_offer_status() to anon, authenticated;

-- Public proof numbers for the home page: finished tests and different sites/apps tested.
-- Totals only. The page shows them only once they're big enough to mean something.
create or replace function public.public_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tests', (select count(*) from public.tests where status = 'done'),
    'customers', (select coalesce(sum(total), 0) from public.tests where status = 'done'),
    'sites', (select count(distinct lower(regexp_replace(regexp_replace(url, '^[a-z]+://(www\.)?', ''), '[/?#].*$', '')))
                from public.tests where status = 'done'))
$$;
revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;
