-- 0013: monthly subscriptions (replace the one-time packs).
--
-- How it works (plain English):
--   * Stripe runs the subscription (charges the card every month, retries failed payments,
--     handles cancelling). We only LISTEN to Stripe's webhook.
--   * Every PAID monthly invoice adds that plan's tests to the account (record_invoice ->
--     grant_tests). The invoice id is the primary key in `purchases`, so a webhook Stripe sends
--     twice never adds tests twice. Unused tests roll over (simple, and nobody loses what they paid for).
--   * A failed payment adds nothing. A cancelled plan stops renewing at the end of the month.
--   * `subscriptions` mirrors Stripe's status so the app can show "renews on ..." / "payment failed".
--     Events can arrive out of order, so an older event never overwrites a newer one (event_at).
--   * Counting tests is now ALL-TIME for everyone: 1 free test + every test added (bonus_tests).

alter table public.profiles add column if not exists stripe_customer_id text unique;

create table public.subscriptions (
  id text primary key,                                  -- Stripe subscription id (sub_...)
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id text not null,                            -- Stripe customer id (cus_...)
  plan_id text not null check (plan_id in ('launch', 'studio')),
  status text not null,                                 -- active, trialing, past_due, canceled, unpaid, incomplete...
  period_end timestamptz,                               -- when the current month ends (next charge)
  cancel_at_period_end boolean not null default false,  -- cancelled, but still active until period_end
  event_at timestamptz not null,                        -- time of the Stripe event that wrote this row
  updated_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
create policy "Users can see their own subscriptions" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- purchases.id now also holds Stripe invoice ids (in_...). Same table, same "never twice" rule.

-- Everyone's base allowance is the 1 free test; paid tests live in bonus_tests.
create or replace function public.plan_test_limit(p_plan text) returns integer
language sql immutable set search_path = '' as $$ select 1 $$;

-- The user's live plan: the best active subscription, else 'free'.
create or replace function public.active_plan(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s
      where s.user_id = p_user and s.status in ('active', 'trialing', 'past_due')
      order by (s.plan_id = 'studio') desc limit 1),
    'free')
$$;
revoke all on function public.active_plan(uuid) from public, anon, authenticated;

-- Stripe webhook (service role only): mirror a subscription's state.
create or replace function public.sync_subscription(
  p_sub text, p_user uuid, p_customer text, p_plan text, p_status text,
  p_period_end timestamptz, p_cancel boolean, p_event_at timestamptz)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_sub is null or p_sub !~ '^sub_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad subscription id.'; end if;
  if p_customer is null or p_customer !~ '^cus_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad customer id.'; end if;
  if p_plan not in ('launch', 'studio') then raise exception 'Unknown plan.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;

  insert into public.subscriptions as s (id, user_id, customer_id, plan_id, status, period_end, cancel_at_period_end, event_at)
  values (p_sub, p_user, p_customer, p_plan, left(p_status, 40), p_period_end, coalesce(p_cancel, false), p_event_at)
  on conflict (id) do update
    set status = excluded.status, period_end = coalesce(excluded.period_end, s.period_end),
        cancel_at_period_end = excluded.cancel_at_period_end, plan_id = excluded.plan_id,
        event_at = excluded.event_at, updated_at = now()
    where s.event_at <= excluded.event_at and s.user_id = excluded.user_id;   -- never let an older event win
  if not found then return false; end if;

  update public.profiles
     set plan = public.active_plan(p_user),
         stripe_customer_id = coalesce(stripe_customer_id, p_customer)
   where id = p_user;
  return true;
end $$;
revoke all on function public.sync_subscription(text, uuid, text, text, text, timestamptz, boolean, timestamptz) from public, anon, authenticated;

-- Stripe webhook (service role only): a monthly invoice was PAID -> add that month's tests, once.
create or replace function public.record_invoice(p_invoice text, p_user uuid, p_plan text, p_tests integer, p_amount integer, p_currency text default 'usd')
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_invoice is null or p_invoice !~ '^in_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad invoice id.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;
  insert into public.purchases (id, user_id, plan_id, tests, amount_cents, currency)
  values (p_invoice, p_user, p_plan, p_tests, p_amount, coalesce(p_currency, 'usd'))
  on conflict (id) do nothing;
  if not found then return false; end if;       -- Stripe retried: already counted
  perform public.grant_tests(p_user, p_tests);
  return true;
end $$;
revoke all on function public.record_invoice(text, uuid, text, integer, integer, text) from public, anon, authenticated;

-- start_test: same as before, but counting is all-time for every plan.
create or replace function public.start_test(p_crawl_id text, p_settings jsonb, p_secret text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_crawl public.crawls;
  v_profile public.profiles;
  v_used integer;
  v_id text;
  v_count integer;
  v_allowed integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_crawl from public.crawls where id = p_crawl_id and user_id = v_user;
  if not found then raise exception 'That analysis was not found. Analyze the URL again.'; end if;
  if v_crawl.status <> 'done' then raise exception 'The analysis is not finished yet.'; end if;

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    insert into public.profiles (id) values (v_user) returning * into v_profile;
  end if;
  if not v_profile.is_admin then
    perform public.check_job_cap(v_user);
    select count(*) into v_used from public.tests where user_id = v_user and status <> 'error';
    v_allowed := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
                 + case when public.verified_referrals(v_user) >= public.referrals_needed() then 1 else 0 end;
    if v_used >= v_allowed then
      raise exception 'LIMIT_REACHED';
    end if;
  end if;

  v_count := public.test_size_for(v_user);
  v_id := public.short_id();
  insert into public.tests (id, user_id, crawl_id, url, goal, status, total, data)
  values (v_id, v_user, p_crawl_id, v_crawl.url, p_settings #>> '{profile,goal}', 'queued', v_count,
          jsonb_build_object('settings', p_settings || jsonb_build_object('count', v_count)));
  insert into public.jobs (kind, ref_id, user_id, secret, max_attempts) values ('run', v_id, v_user, p_secret, 2);
  return v_id;
end $$;

-- my_plan: adds the subscription (for "renews on ..." and "Manage billing").
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
  return jsonb_build_object(
    'plan', case when v_bought and v_profile.plan = 'free' then 'pack' else v_profile.plan end,
    'unlimited', coalesce(v_profile.is_admin, false),
    'customers', public.test_size_for(v_user),
    'used', v_used,
    'limit', v_limit,
    'left', greatest(0, v_limit - v_used),
    'billing', v_profile.stripe_customer_id is not null,
    'subscription', case when v_sub.id is null then null else jsonb_build_object(
        'plan', v_sub.plan_id, 'status', v_sub.status, 'renews', v_sub.period_end,
        'cancelling', v_sub.cancel_at_period_end) end,
    'referrals', jsonb_build_object('count', v_refs, 'needed', public.referrals_needed(), 'code', v_profile.referral_code));
end $$;
