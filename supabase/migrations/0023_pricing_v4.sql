-- 0023: FINAL PRICING (founder, 2026-11-25). Everything is measured in CRAWLERS (1 Crawler = 1 simulated customer).
--   Free trial  25 Crawlers once (one introductory test; its report is a PREVIEW until they pay)
--   Starter $19/mo  1,000 / month   no Ad Analysis
--   Growth  $49/mo  5,000 / month   Ad Analysis unlocks here
--   Pro     $99/mo  15,000 / month  priority processing
--   Agency  $199/mo 40,000 / month  highest priority
-- + monthly OR annual billing (annual allowances still reset every month),
-- + one-time CRAWLER PACKS (500 / 2,000 / 10,000 / 25,000) that never expire and never unlock Ad Analysis,
-- + launch-offer lookup for waitlist members, + "need more Crawlers?" requests for custom volume.
-- The numbers MUST match src/lib/plans.ts. Old plans (scale, launch, studio) keep working for anyone on them.

-- ---------- plan names ----------
alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions add constraint subscriptions_plan_id_check
  check (plan_id in ('launch', 'studio', 'starter', 'growth', 'scale', 'pro', 'agency'));
alter table public.subscriptions add column if not exists billing_interval text not null default 'month';
alter table public.subscriptions drop constraint if exists subscriptions_billing_interval_check;
alter table public.subscriptions add constraint subscriptions_billing_interval_check check (billing_interval in ('month', 'year'));
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'launch', 'studio', 'starter', 'growth', 'scale', 'pro', 'agency'));

-- Crawlers per month (0 = not a monthly-allowance plan).
create or replace function public.plan_customers(p_plan text) returns integer
language sql immutable set search_path = '' as $$
  select case p_plan when 'starter' then 1000 when 'growth' then 5000 when 'pro' then 15000
                     when 'agency' then 40000 when 'scale' then 30000 else 0 end
$$;
-- Ad Analysis (video, ad and creator tests) starts at Growth.
create or replace function public.plan_has_ads(p_plan text) returns boolean
language sql immutable set search_path = '' as $$ select p_plan in ('growth', 'pro', 'agency', 'scale') $$;
-- Queue priority: Pro = priority, Agency = highest.
create or replace function public.plan_priority(p_plan text) returns integer
language sql immutable set search_path = '' as $$ select case p_plan when 'pro' then 1 when 'agency' then 2 else 0 end $$;
-- Monthly price (for the founder's revenue numbers).
create or replace function public.plan_price_cents(p_plan text) returns integer
language sql immutable set search_path = '' as $$
  select case p_plan when 'starter' then 1900 when 'growth' then 4900 when 'pro' then 9900 when 'agency' then 19900
                     when 'scale' then 25000 when 'launch' then 1900 when 'studio' then 4900 else 0 end
$$;

-- When THIS month's allowance started. Monthly billing: the billing period start.
-- Annual billing: the same day each month inside the year (so 40,000/month never becomes 40,000/year).
create or replace function public.allowance_start(p_sub public.subscriptions) returns timestamptz
language sql stable set search_path = '' as $$
  select case
    when p_sub.billing_interval = 'year' and p_sub.period_start is not null then
      p_sub.period_start + make_interval(months =>
        (extract(year from age(now(), p_sub.period_start))::int * 12 + extract(month from age(now(), p_sub.period_start))::int))
    else p_sub.period_start end
$$;
revoke all on function public.allowance_start(public.subscriptions) from public, anon, authenticated;

-- ---------- one-time Crawler packs ----------
alter table public.profiles add column if not exists pack_crawlers integer not null default 0;
alter table public.profiles drop constraint if exists profiles_pack_crawlers_check;
alter table public.profiles add constraint profiles_pack_crawlers_check check (pack_crawlers >= 0);
-- how many of a test's Crawlers came out of a pack (refunded if the test fails), and the free-trial marker
alter table public.tests add column if not exists pack_used integer not null default 0;
alter table public.tests add column if not exists tier text;
alter table public.purchases add column if not exists crawlers integer not null default 0;
alter table public.purchases drop constraint if exists purchases_plan_id_check;
alter table public.purchases add constraint purchases_plan_id_check
  check (plan_id in ('launch', 'studio', 'pack500', 'pack2000', 'pack10000', 'pack25000'));
alter table public.purchases drop constraint if exists purchases_tests_check;
alter table public.purchases add constraint purchases_tests_check check (tests >= 0 and tests <= 100);

create or replace function public.pack_crawlers(p_pack text) returns integer
language sql immutable set search_path = '' as $$
  select case p_pack when 'pack500' then 500 when 'pack2000' then 2000 when 'pack10000' then 10000 when 'pack25000' then 25000 else 0 end
$$;
create or replace function public.pack_price_cents(p_pack text) returns integer
language sql immutable set search_path = '' as $$
  select case p_pack when 'pack500' then 900 when 'pack2000' then 2900 when 'pack10000' then 9900 when 'pack25000' then 19900 else 0 end
$$;

-- Stripe webhook only (service role): a paid pack adds Crawlers ONCE (the checkout session id is the key).
create or replace function public.record_pack(
  p_session text, p_user uuid, p_pack text, p_amount integer, p_currency text default 'usd', p_customer text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_crawlers integer := public.pack_crawlers(p_pack);
begin
  if p_session is null or p_session !~ '^cs_[A-Za-z0-9_]{8,200}$' then raise exception 'Bad session id.'; end if;
  if v_crawlers <= 0 then raise exception 'Unknown pack.'; end if;
  if p_amount is null or p_amount < 0 or p_amount > public.pack_price_cents(p_pack) then raise exception 'Bad amount.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;
  insert into public.purchases (id, user_id, plan_id, tests, crawlers, amount_cents, currency)
  values (p_session, p_user, p_pack, 0, v_crawlers, p_amount, coalesce(p_currency, 'usd'))
  on conflict (id) do nothing;
  if not found then return false; end if; -- already counted (Stripe retries)
  update public.profiles
     set pack_crawlers = pack_crawlers + v_crawlers,
         stripe_customer_id = coalesce(stripe_customer_id, case when p_customer ~ '^cus_[A-Za-z0-9_]{6,200}$' then p_customer end)
   where id = p_user;
  -- the founder's revenue log (and Slack sale alert)
  insert into public.payments (id, user_id, plan_id, amount_cents, currency, paid_at)
  values (p_session, p_user, p_pack, p_amount, coalesce(p_currency, 'usd'), now())
  on conflict (id) do nothing;
  return true;
end $$;
revoke all on function public.record_pack(text, uuid, text, integer, text, text) from public, anon, authenticated;

-- A test that fails gives its pack Crawlers back (failed tests never count).
create or replace function public.refund_pack_on_error() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'error' and old.status is distinct from 'error' and coalesce(new.pack_used, 0) > 0 then
    update public.profiles set pack_crawlers = pack_crawlers + new.pack_used where id = new.user_id;
    new.pack_used := 0; -- so it can never be refunded twice
  end if;
  return new;
end $$;
drop trigger if exists tests_pack_refund on public.tests;
create trigger tests_pack_refund before update of status on public.tests
  for each row execute function public.refund_pack_on_error();

-- Crawlers used from the MONTHLY allowance since a date (pack Crawlers and the free trial don't count against it).
create or replace function public.customers_used(p_user uuid, p_since timestamptz) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(t.total - coalesce(t.pack_used, 0)), 0)::integer from public.tests t
   where t.user_id = p_user and t.status <> 'error' and t.tier is distinct from 'trial'
     and t.created_at >= coalesce(p_since, date_trunc('month', now()))
$$;
revoke all on function public.customers_used(uuid, timestamptz) from public, anon, authenticated;

-- ---------- priority processing ----------
alter table public.jobs add column if not exists priority smallint not null default 0;
create or replace function public.user_priority(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when coalesce((select is_admin from public.profiles where id = p_user), false) then 2
              else coalesce(public.plan_priority((public.live_sub(p_user)).plan_id), 0) end
$$;
revoke all on function public.user_priority(uuid) from public, anon, authenticated;
-- every new job (analysis or test) gets its owner's priority automatically
create or replace function public.jobs_set_priority() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.priority := coalesce(public.user_priority(new.user_id), 0);
  return new;
exception when others then
  new.priority := 0;
  return new;
end $$;
drop trigger if exists jobs_priority on public.jobs;
create trigger jobs_priority before insert on public.jobs for each row execute function public.jobs_set_priority();

-- The worker takes the next job. Priority jobs go first, but only by a few minutes ("ageing"),
-- so nobody's test waits forever: priority 1 counts as 2 minutes older, priority 2 as 4 minutes older.
create or replace function public.claim_job(p_worker text) returns setof public.jobs
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    update public.jobs set status = 'error', last_error = 'worker stopped responding', updated_at = now()
     where status = 'running' and heartbeat_at < now() - interval '5 minutes' and attempts >= max_attempts
    returning kind, ref_id
  loop
    if r.kind = 'run' then
      update public.tests set status = 'error', error = 'The test stopped unexpectedly. Please try again.', updated_at = now() where id = r.ref_id;
    else
      update public.crawls set status = 'error', error = 'The analysis stopped unexpectedly. Please try again.', updated_at = now() where id = r.ref_id;
    end if;
  end loop;

  return query
  update public.jobs j
     set status = 'running', attempts = j.attempts + 1, locked_by = p_worker,
         locked_at = now(), heartbeat_at = now(), updated_at = now()
   where j.id = (
     select id from public.jobs
      where status = 'queued'
         or (status = 'running' and heartbeat_at < now() - interval '5 minutes' and attempts < max_attempts)
      order by created_at - make_interval(mins => priority * 2), id
      for update skip locked
      limit 1)
  returning j.*;
end $$;
revoke all on function public.claim_job(text) from public, anon, authenticated;

-- ---------- Stripe webhook: now also stores monthly vs annual ----------
drop function if exists public.sync_subscription(text, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz);
create or replace function public.sync_subscription(
  p_sub text, p_user uuid, p_customer text, p_plan text, p_status text,
  p_period_start timestamptz, p_period_end timestamptz, p_cancel boolean, p_event_at timestamptz,
  p_interval text default 'month')
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_sub is null or p_sub !~ '^sub_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad subscription id.'; end if;
  if p_customer is null or p_customer !~ '^cus_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad customer id.'; end if;
  if p_plan not in ('launch', 'studio', 'starter', 'growth', 'scale', 'pro', 'agency') then raise exception 'Unknown plan.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;

  insert into public.subscriptions as s (id, user_id, customer_id, plan_id, status, period_start, period_end, cancel_at_period_end, event_at, billing_interval)
  values (p_sub, p_user, p_customer, p_plan, left(p_status, 40), p_period_start, p_period_end, coalesce(p_cancel, false), p_event_at,
          case when p_interval = 'year' then 'year' else 'month' end)
  on conflict (id) do update
    set status = excluded.status,
        period_start = coalesce(excluded.period_start, s.period_start),
        period_end = coalesce(excluded.period_end, s.period_end),
        cancel_at_period_end = excluded.cancel_at_period_end, plan_id = excluded.plan_id,
        billing_interval = excluded.billing_interval,
        event_at = excluded.event_at, updated_at = now()
    where s.event_at <= excluded.event_at and s.user_id = excluded.user_id;
  if not found then return false; end if;

  update public.profiles
     set plan = public.active_plan(p_user),
         stripe_customer_id = coalesce(stripe_customer_id, p_customer)
   where id = p_user;
  return true;
end $$;
revoke all on function public.sync_subscription(text, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz, text) from public, anon, authenticated;

-- ---------- start_test: monthly allowance first, then pack Crawlers ----------
create or replace function public.start_test(p_crawl_id text, p_settings jsonb, p_secret text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_crawl public.crawls;
  v_profile public.profiles;
  v_sub public.subscriptions;
  v_used integer;
  v_id text;
  v_count integer;
  v_allowed integer;
  v_asked integer;
  v_left integer := 0;
  v_pack integer := 0;
  v_tier text;
  v_video boolean := coalesce(p_settings ->> 'kind', '') = 'video';
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_crawl from public.crawls where id = p_crawl_id and user_id = v_user;
  if not found then raise exception 'That analysis was not found. Analyze the URL again.'; end if;
  if v_crawl.status <> 'done' then raise exception 'The analysis is not finished yet.'; end if;

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    insert into public.profiles (id) values (v_user) returning * into v_profile;
  end if;

  -- Only these sizes; anything else becomes 100.
  v_asked := case when (p_settings ->> 'count') in ('100', '250', '500', '1000') then (p_settings ->> 'count')::integer else 100 end;
  v_sub := public.live_sub(v_user);

  if v_profile.is_admin then
    v_count := v_asked;
  elsif v_sub.id is not null or v_profile.pack_crawlers > 0 then
    -- Paid: this month's allowance first, then pack Crawlers. Packs never pay for Ad Analysis.
    perform public.check_job_cap(v_user);
    if v_sub.id is not null then
      if v_video and not public.plan_has_ads(v_sub.plan_id) then raise exception 'PLAN_NO_ADS'; end if;
      v_left := greatest(0, public.plan_customers(v_sub.plan_id) - public.customers_used(v_user, public.allowance_start(v_sub)));
    elsif v_video then
      raise exception 'PLAN_NO_ADS';
    end if;
    if v_video then
      if v_asked > v_left then raise exception 'LIMIT_REACHED'; end if;
    else
      if v_asked > v_left + v_profile.pack_crawlers then raise exception 'LIMIT_REACHED'; end if;
      v_pack := greatest(0, v_asked - v_left);
    end if;
    v_count := v_asked;
    if v_pack > 0 then
      update public.profiles set pack_crawlers = pack_crawlers - v_pack where id = v_user;
    end if;
  else
    -- Free trial (or an old sandbox plan): counted in tests, size decided by test_size_for.
    perform public.check_job_cap(v_user);
    if v_video and v_profile.plan not in ('launch', 'studio') then raise exception 'PLAN_NO_ADS'; end if;
    select count(*) into v_used from public.tests where user_id = v_user and status <> 'error';
    v_allowed := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
                 + case when public.verified_referrals(v_user) >= public.referrals_needed() then 1 else 0 end;
    if v_used >= v_allowed then raise exception 'LIMIT_REACHED'; end if;
    v_count := public.test_size_for(v_user);
    -- the introductory test of a free account: its report is a preview until they upgrade
    if v_used = 0 and v_profile.plan = 'free' and v_profile.bonus_tests <= 0 then v_tier := 'trial'; end if;
  end if;

  v_id := public.short_id();
  insert into public.tests (id, user_id, crawl_id, url, goal, status, total, pack_used, tier, data)
  values (v_id, v_user, p_crawl_id, v_crawl.url, p_settings #>> '{profile,goal}', 'queued', v_count, v_pack, v_tier,
          jsonb_build_object('settings', p_settings || jsonb_build_object('count', v_count)));
  insert into public.jobs (kind, ref_id, user_id, secret, max_attempts) values ('run', v_id, v_user, p_secret, 2);
  return v_id;
end $$;

-- Has this person ever paid (any subscription or pack)? Paying unlocks their trial report in full.
create or replace function public.has_paid(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = p_user), false)
      or exists (select 1 from public.subscriptions where user_id = p_user and status in ('active', 'trialing', 'past_due', 'canceled'))
      or exists (select 1 from public.purchases where user_id = p_user)
$$;
revoke all on function public.has_paid(uuid) from public, anon, authenticated;

-- ---------- my_plan: + packs, priority, billing interval, annual month windows, preview unlock ----------
create or replace function public.my_plan() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_refs integer;
  v_used integer;
  v_limit integer;
  v_bought boolean;
  v_sub public.subscriptions;
  v_live public.subscriptions;
  v_cust_used integer;
  v_start timestamptz;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_profile from public.profiles where id = v_user;
  v_refs := public.verified_referrals(v_user);
  v_bought := exists (select 1 from public.purchases where user_id = v_user);
  select count(*) into v_used from public.tests where user_id = v_user and status <> 'error';
  v_limit := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
             + case when v_refs >= public.referrals_needed() then 1 else 0 end;
  select * into v_sub from public.subscriptions
   where user_id = v_user order by (status in ('active', 'trialing', 'past_due')) desc, event_at desc limit 1;
  v_live := public.live_sub(v_user);
  if v_live.id is not null then
    v_start := public.allowance_start(v_live);
    v_cust_used := public.customers_used(v_user, v_start);
  end if;
  return jsonb_build_object(
    'plan', case when v_bought and v_profile.plan = 'free' then 'pack' else v_profile.plan end,
    'unlimited', coalesce(v_profile.is_admin, false),
    'customers', case when v_live.id is not null or v_profile.pack_crawlers > 0 then 100 else public.test_size_for(v_user) end,
    'used', v_used,
    'limit', v_limit,
    'left', greatest(0, v_limit - v_used),
    'packs', v_profile.pack_crawlers,
    'paid', public.has_paid(v_user),
    'priority', public.user_priority(v_user),
    'ads', coalesce(v_profile.is_admin, false) or v_profile.plan in ('launch', 'studio') or (v_live.id is not null and public.plan_has_ads(v_live.plan_id)),
    'monthly', case when v_live.id is null then null else jsonb_build_object(
        'allowance', public.plan_customers(v_live.plan_id), 'used', v_cust_used,
        'left', greatest(0, public.plan_customers(v_live.plan_id) - v_cust_used),
        'resets', case when v_live.billing_interval = 'year' then v_start + interval '1 month' else v_live.period_end end) end,
    'billing', v_profile.stripe_customer_id is not null,
    'subscription', case when v_sub.id is null then null else jsonb_build_object(
        'plan', v_sub.plan_id, 'status', v_sub.status, 'renews', v_sub.period_end,
        'cancelling', v_sub.cancel_at_period_end, 'interval', v_sub.billing_interval) end,
    'referrals', jsonb_build_object('count', v_refs, 'needed', public.referrals_needed(), 'code', v_profile.referral_code));
end $$;

-- ---------- launch offer: is this (verified) account on the waitlist, and how big is the waitlist? ----------
-- The SERVER uses this at checkout to pick the one discount (src/lib/plans.ts launchDiscount).
create or replace function public.launch_offer() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_email text;
  v_verified boolean;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  select lower(email), email_confirmed_at is not null into v_email, v_verified from auth.users where id = auth.uid();
  return jsonb_build_object(
    'on_waitlist', coalesce(v_verified, false) and v_email is not null
                   and exists (select 1 from public.waitlist w where lower(w.email) = v_email),
    'waitlist_size', (select count(*) from public.waitlist));
end $$;
revoke all on function public.launch_offer() from public, anon;
grant execute on function public.launch_offer() to authenticated;

-- ---------- "Need more Crawlers?": custom volume requests ----------
create table if not exists public.sales_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  company text,
  volume text,
  message text,
  created_at timestamptz not null default now()
);
alter table public.sales_requests enable row level security; -- no policies: nobody reads or writes it from a browser
revoke all on public.sales_requests from anon, authenticated;

create or replace function public.request_custom_volume(p_name text, p_email text, p_company text, p_volume text, p_message text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  if length(v_name) < 1 then raise exception 'Please add your name.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(v_email) > 200 then raise exception 'Please check your email address.'; end if;
  -- flood guards
  if (select count(*) from public.sales_requests where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many requests right now. Please try again later.';
  end if;
  if (select count(*) from public.sales_requests where email = v_email and created_at > now() - interval '1 day') >= 3 then
    return true; -- already received, quietly
  end if;
  insert into public.sales_requests (user_id, name, email, company, volume, message)
  values (auth.uid(), v_name, v_email, nullif(left(trim(coalesce(p_company, '')), 120), ''),
          nullif(left(trim(coalesce(p_volume, '')), 60), ''), nullif(left(trim(coalesce(p_message, '')), 1000), ''));
  -- tell the founder (Slack pulse); they need the email to reply, so it isn't masked here
  begin
    insert into public.ops_events (kind, data)
    values ('sales_request', jsonb_build_object('name', v_name, 'email', v_email, 'company', left(coalesce(p_company, ''), 120), 'volume', left(coalesce(p_volume, ''), 60)));
  exception when others then null;
  end;
  return true;
end $$;
revoke all on function public.request_custom_volume(text, text, text, text, text) from public;
grant execute on function public.request_custom_volume(text, text, text, text, text) to anon, authenticated;

-- Admins see the requests on /admin/insights.
create or replace function public.admin_sales_requests() returns setof public.sales_requests
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then raise exception 'Admins only.'; end if;
  return query select * from public.sales_requests order by created_at desc limit 100;
end $$;
revoke all on function public.admin_sales_requests() from public, anon;
grant execute on function public.admin_sales_requests() to authenticated;

-- (applied separately as 0023b and 0023c)
-- 0023c: the two trigger functions are only for the database's own triggers, never for the API.
revoke all on function public.jobs_set_priority() from public, anon, authenticated;
revoke all on function public.refund_pack_on_error() from public, anon, authenticated;
