-- 0014: plans measured in SIMULATED CUSTOMERS per month (founder's pricing, 2026-11-22).
--   Starter $25/month = 1,000 customers (no video/ad tests)
--   Growth $100/month = 10,000 customers
--   Scale   $250/month = 30,000 customers
-- Each test uses as many customers as it simulates (100, 250, 500 or 1,000: the person picks).
-- The allowance resets every billing month (counted from the subscription's current period start).
-- No Stripe "grant" is needed: the subscription's status + period are enough.
-- Running a new test needs status active/trialing (a failed payment blocks new tests until the card works).
-- Free accounts are unchanged: 1 starter test (25 customers), +1 full test for 3 verified invites.
-- Old sandbox plans (launch/studio) keep working the old way (tests in bonus_tests).

alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions add constraint subscriptions_plan_id_check
  check (plan_id in ('launch', 'studio', 'starter', 'growth', 'scale'));
alter table public.subscriptions add column if not exists period_start timestamptz;

-- Customers per month for each plan (0 = not a customer-allowance plan).
-- MUST match src/lib/plans.ts.
create or replace function public.plan_customers(p_plan text) returns integer
language sql immutable set search_path = '' as $$
  select case p_plan when 'starter' then 1000 when 'growth' then 10000 when 'scale' then 30000 else 0 end
$$;
-- Which plans include video / ad tests.
create or replace function public.plan_has_ads(p_plan text) returns boolean
language sql immutable set search_path = '' as $$ select p_plan in ('growth', 'scale') $$;

-- The live customer-allowance subscription (best plan first), or nothing.
create or replace function public.live_sub(p_user uuid) returns public.subscriptions
language sql stable security definer set search_path = '' as $$
  select s.* from public.subscriptions s
   where s.user_id = p_user and s.status in ('active', 'trialing') and public.plan_customers(s.plan_id) > 0
   order by public.plan_customers(s.plan_id) desc limit 1
$$;
revoke all on function public.live_sub(uuid) from public, anon, authenticated;

-- Customers used in the current billing month.
create or replace function public.customers_used(p_user uuid, p_since timestamptz) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(t.total), 0)::integer from public.tests t
   where t.user_id = p_user and t.status <> 'error'
     and t.created_at >= coalesce(p_since, date_trunc('month', now()))
$$;
revoke all on function public.customers_used(uuid, timestamptz) from public, anon, authenticated;

-- The plan shown everywhere: best active (or retrying) subscription, else 'free'.
create or replace function public.active_plan(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s
      where s.user_id = p_user and s.status in ('active', 'trialing', 'past_due')
      order by public.plan_customers(s.plan_id) desc, (s.plan_id = 'studio') desc limit 1),
    'free')
$$;

-- Stripe webhook (service role only): now also stores the period START (when the month's allowance resets).
drop function if exists public.sync_subscription(text, uuid, text, text, text, timestamptz, boolean, timestamptz);
create or replace function public.sync_subscription(
  p_sub text, p_user uuid, p_customer text, p_plan text, p_status text,
  p_period_start timestamptz, p_period_end timestamptz, p_cancel boolean, p_event_at timestamptz)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_sub is null or p_sub !~ '^sub_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad subscription id.'; end if;
  if p_customer is null or p_customer !~ '^cus_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad customer id.'; end if;
  if p_plan not in ('launch', 'studio', 'starter', 'growth', 'scale') then raise exception 'Unknown plan.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;

  insert into public.subscriptions as s (id, user_id, customer_id, plan_id, status, period_start, period_end, cancel_at_period_end, event_at)
  values (p_sub, p_user, p_customer, p_plan, left(p_status, 40), p_period_start, p_period_end, coalesce(p_cancel, false), p_event_at)
  on conflict (id) do update
    set status = excluded.status,
        period_start = coalesce(excluded.period_start, s.period_start),
        period_end = coalesce(excluded.period_end, s.period_end),
        cancel_at_period_end = excluded.cancel_at_period_end, plan_id = excluded.plan_id,
        event_at = excluded.event_at, updated_at = now()
    where s.event_at <= excluded.event_at and s.user_id = excluded.user_id;
  if not found then return false; end if;

  update public.profiles
     set plan = public.active_plan(p_user),
         stripe_customer_id = coalesce(stripe_customer_id, p_customer)
   where id = p_user;
  return true;
end $$;
revoke all on function public.sync_subscription(text, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz) from public, anon, authenticated;

-- start_test: the browser may ASK for a size (settings.count); the database decides.
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
  elsif v_sub.id is not null then
    -- Paid (customers per month).
    perform public.check_job_cap(v_user);
    if v_video and not public.plan_has_ads(v_sub.plan_id) then raise exception 'PLAN_NO_ADS'; end if;
    v_used := public.customers_used(v_user, v_sub.period_start);
    if v_used + v_asked > public.plan_customers(v_sub.plan_id) then raise exception 'LIMIT_REACHED'; end if;
    v_count := v_asked;
  else
    -- Free (or an old sandbox plan): counted in tests, size decided by test_size_for.
    perform public.check_job_cap(v_user);
    if v_video and v_profile.plan not in ('launch', 'studio') then raise exception 'PLAN_NO_ADS'; end if;
    select count(*) into v_used from public.tests where user_id = v_user and status <> 'error';
    v_allowed := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
                 + case when public.verified_referrals(v_user) >= public.referrals_needed() then 1 else 0 end;
    if v_used >= v_allowed then raise exception 'LIMIT_REACHED'; end if;
    v_count := public.test_size_for(v_user);
  end if;

  v_id := public.short_id();
  insert into public.tests (id, user_id, crawl_id, url, goal, status, total, data)
  values (v_id, v_user, p_crawl_id, v_crawl.url, p_settings #>> '{profile,goal}', 'queued', v_count,
          jsonb_build_object('settings', p_settings || jsonb_build_object('count', v_count)));
  insert into public.jobs (kind, ref_id, user_id, secret, max_attempts) values ('run', v_id, v_user, p_secret, 2);
  return v_id;
end $$;

-- my_plan: adds the monthly customer allowance for paid plans.
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
  if v_live.id is not null then v_cust_used := public.customers_used(v_user, v_live.period_start); end if;
  return jsonb_build_object(
    'plan', case when v_bought and v_profile.plan = 'free' then 'pack' else v_profile.plan end,
    'unlimited', coalesce(v_profile.is_admin, false),
    'customers', case when v_live.id is not null then 100 else public.test_size_for(v_user) end,
    'used', v_used,
    'limit', v_limit,
    'left', greatest(0, v_limit - v_used),
    'ads', coalesce(v_profile.is_admin, false) or v_profile.plan in ('launch', 'studio') or (v_live.id is not null and public.plan_has_ads(v_live.plan_id)),
    'monthly', case when v_live.id is null then null else jsonb_build_object(
        'allowance', public.plan_customers(v_live.plan_id), 'used', v_cust_used,
        'left', greatest(0, public.plan_customers(v_live.plan_id) - v_cust_used), 'resets', v_live.period_end) end,
    'billing', v_profile.stripe_customer_id is not null,
    'subscription', case when v_sub.id is null then null else jsonb_build_object(
        'plan', v_sub.plan_id, 'status', v_sub.status, 'renews', v_sub.period_end,
        'cancelling', v_sub.cancel_at_period_end) end,
    'referrals', jsonb_build_object('count', v_refs, 'needed', public.referrals_needed(), 'code', v_profile.referral_code));
end $$;
