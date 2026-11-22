-- 0016: the founder's "pulse": Slack alerts + a daily report with revenue and records.
--
-- How it works (plain English):
--   1. `payments`: every PAID Stripe invoice (first month + each renewal) is saved by the webhook
--      (record_payment). This is the real revenue list.
--   2. Database TRIGGERS write a short row into `ops_events` when something worth knowing happens:
--      a sign-up, a waitlist join, a payment, a new / cancelled / failed subscription, a failed test
--      or analysis. Triggers can't be forgotten: they fire no matter which code path made the change.
--   3. The WORKER (always running) reads unsent events every ~30s, posts them to Slack, marks them sent.
--      Once a day it posts the daily report from ops_digest().
-- Nobody can read these tables from a browser (RLS on, no policies). Service role only.

-- ---------- revenue ----------
create table public.payments (
  id text primary key,                       -- Stripe invoice id (in_...): a payment is saved once
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  paid_at timestamptz not null default now()
);
create index payments_paid_idx on public.payments (paid_at);
alter table public.payments enable row level security;
create policy "Users can see their own payments" on public.payments
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.record_payment(p_invoice text, p_user uuid, p_plan text, p_amount integer, p_currency text, p_paid_at timestamptz)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_invoice is null or p_invoice !~ '^in_[A-Za-z0-9_]{6,200}$' then raise exception 'Bad invoice id.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;
  insert into public.payments (id, user_id, plan_id, amount_cents, currency, paid_at)
  values (p_invoice, p_user, left(p_plan, 20), greatest(p_amount, 0), coalesce(p_currency, 'usd'), coalesce(p_paid_at, now()))
  on conflict (id) do nothing;
  return found;
end $$;
revoke all on function public.record_payment(text, uuid, text, integer, text, timestamptz) from public, anon, authenticated;

-- Monthly price of each plan in cents (for MRR). MUST match src/lib/plans.ts.
create or replace function public.plan_price_cents(p_plan text) returns integer
language sql immutable set search_path = '' as $$
  select case p_plan when 'starter' then 2500 when 'growth' then 10000 when 'scale' then 25000
                     when 'launch' then 1900 when 'studio' then 4900 else 0 end
$$;

-- ---------- events + settings ----------
create table public.ops_events (
  id bigserial primary key,
  kind text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index ops_events_unsent_idx on public.ops_events (id) where sent_at is null;
alter table public.ops_events enable row level security;
revoke all on public.ops_events from anon, authenticated;

create table public.ops_state (key text primary key, value jsonb not null);
alter table public.ops_state enable row level security;
revoke all on public.ops_state from anon, authenticated;

-- The founder's time zone (the worker sets it from DIGEST_TZ). "Today" and "record day" use it.
create or replace function public.ops_tz() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select value #>> '{}' from public.ops_state where key = 'tz'), 'America/New_York')
$$;

-- "j***@gmail.com": enough to recognise someone, without spreading full emails into Slack.
create or replace function public.mask_email(p text) returns text
language sql immutable set search_path = '' as $$
  select case when p is null or position('@' in p) = 0 then null
              else left(p, 1) || '***@' || split_part(p, '@', 2) end
$$;

-- ---------- triggers ----------
create or replace function public.ops_on_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ops_events (kind, data) values ('signup', jsonb_build_object(
    'email', public.mask_email((select email from auth.users where id = new.id)),
    'total', (select count(*) from public.profiles)));
  return new;
exception when others then
  return new; -- an alert must NEVER break a sign-up, payment or test
end $$;
create trigger ops_profile_insert after insert on public.profiles for each row execute function public.ops_on_profile();

create or replace function public.ops_on_waitlist() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ops_events (kind, data) values ('waitlist', jsonb_build_object(
    'name', split_part(coalesce(new.name, ''), ' ', 1),
    'source', new.source,
    'total', (select count(*) from public.waitlist where unsubscribed_at is null)));
  return new;
exception when others then
  return new; -- an alert must NEVER break a sign-up, payment or test
end $$;
create trigger ops_waitlist_insert after insert on public.waitlist for each row execute function public.ops_on_waitlist();

create or replace function public.ops_mrr() returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(public.plan_price_cents(plan_id)), 0)::integer
    from public.subscriptions where status in ('active', 'trialing')
$$;

create or replace function public.ops_on_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_was_live boolean := tg_op = 'UPDATE' and old.status in ('active', 'trialing');
  v_live boolean := new.status in ('active', 'trialing');
begin
  if v_live and not v_was_live then
    v_kind := case when tg_op = 'UPDATE' and old.status in ('past_due', 'unpaid') then 'sub_recovered' else 'sub_new' end;
  elsif new.status in ('past_due', 'unpaid') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    v_kind := 'payment_failed';
  elsif new.status = 'canceled' and tg_op = 'UPDATE' and old.status <> 'canceled' then
    v_kind := 'sub_ended';
  elsif tg_op = 'UPDATE' and new.cancel_at_period_end and not old.cancel_at_period_end then
    v_kind := 'cancel_scheduled';
  elsif tg_op = 'UPDATE' and old.cancel_at_period_end and not new.cancel_at_period_end and v_live then
    v_kind := 'cancel_undone';
  elsif tg_op = 'UPDATE' and old.plan_id <> new.plan_id then
    v_kind := 'plan_changed';
  end if;
  if v_kind is not null then
    insert into public.ops_events (kind, data) values (v_kind, jsonb_build_object(
      'plan', new.plan_id, 'from', case when tg_op = 'UPDATE' then old.plan_id end,
      'email', public.mask_email((select email from auth.users where id = new.user_id)),
      'until', new.period_end, 'mrr', public.ops_mrr(),
      'subscribers', (select count(*) from public.subscriptions where status in ('active', 'trialing'))));
  end if;
  return new;
exception when others then
  return new; -- an alert must NEVER break a sign-up, payment or test
end $$;
create trigger ops_subscription_change after insert or update on public.subscriptions
  for each row execute function public.ops_on_subscription();

-- A payment: also works out if TODAY just became the best revenue day ever.
create or replace function public.ops_on_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tz text := public.ops_tz();
  v_day date := (new.paid_at at time zone v_tz)::date;
  v_today integer;
  v_best_before integer;
begin
  select coalesce(sum(amount_cents), 0) into v_today from public.payments where (paid_at at time zone v_tz)::date = v_day;
  select coalesce(max(s), 0) into v_best_before from (
    select sum(amount_cents) s from public.payments where (paid_at at time zone v_tz)::date < v_day
     group by (paid_at at time zone v_tz)::date) d;
  insert into public.ops_events (kind, data) values ('payment', jsonb_build_object(
    'amount', new.amount_cents, 'plan', new.plan_id, 'currency', new.currency,
    'email', public.mask_email((select email from auth.users where id = new.user_id)),
    'today', v_today, 'best_before', v_best_before,
    'all_time', (select coalesce(sum(amount_cents), 0) from public.payments),
    'all_time_before', (select coalesce(sum(amount_cents), 0) from public.payments) - new.amount_cents,
    'mrr', public.ops_mrr()));
  return new;
exception when others then
  return new; -- an alert must NEVER break a sign-up, payment or test
end $$;
create trigger ops_payment_insert after insert on public.payments for each row execute function public.ops_on_payment();

-- Failed tests and analyses (so a broken worker or site never goes unnoticed).
create or replace function public.ops_on_test() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'error' and old.status is distinct from 'error' then
    insert into public.ops_events (kind, data) values ('test_failed', jsonb_build_object(
      'id', new.id, 'url', new.url, 'error', left(coalesce(new.error, ''), 200)));
  end if;
  return new;
exception when others then
  return new; -- an alert must NEVER break a sign-up, payment or test
end $$;
create trigger ops_test_change after update of status on public.tests for each row execute function public.ops_on_test();

create or replace function public.ops_on_crawl() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'error' and old.status is distinct from 'error' then
    insert into public.ops_events (kind, data) values ('analysis_failed', jsonb_build_object(
      'id', new.id, 'url', new.url, 'error', left(coalesce(new.error, ''), 200)));
  end if;
  return new;
exception when others then
  return new; -- an alert must NEVER break a sign-up, payment or test
end $$;
create trigger ops_crawl_change after update of status on public.crawls for each row execute function public.ops_on_crawl();

-- ---------- the daily report ----------
-- Everything for one day (in the founder's time zone) + all-time records.
create or replace function public.ops_digest(p_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz text := public.ops_tz();
  v_from timestamptz := (p_day::timestamp at time zone v_tz);
  v_to timestamptz := ((p_day + 1)::timestamp at time zone v_tz);
  r jsonb;
begin
  with pay as (
    select (paid_at at time zone v_tz)::date d, sum(amount_cents) cents from public.payments group by 1
  ), sign as (
    select (created_at at time zone v_tz)::date d, count(*) n from public.profiles group by 1
  ), tst as (
    select (created_at at time zone v_tz)::date d, count(*) n from public.tests where status <> 'error' group by 1
  )
  select jsonb_build_object(
    'day', p_day,
    'revenue', coalesce((select cents from pay where d = p_day), 0),
    'payments', (select count(*) from public.payments where paid_at >= v_from and paid_at < v_to),
    'best_revenue_before', coalesce((select max(cents) from pay where d < p_day), 0),
    'revenue_week', coalesce((select sum(cents) from pay where d > p_day - 7 and d <= p_day), 0),
    'revenue_month', coalesce((select sum(cents) from pay where date_trunc('month', d) = date_trunc('month', p_day::timestamp) and d <= p_day), 0),
    'revenue_all', coalesce((select sum(cents) from pay where d <= p_day), 0),
    'mrr', public.ops_mrr(),
    'subscribers', (select jsonb_object_agg(plan_id, n) from (select plan_id, count(*) n from public.subscriptions where status in ('active', 'trialing') group by 1) s),
    'failing_payments', (select count(*) from public.subscriptions where status in ('past_due', 'unpaid')),
    'cancelling', (select count(*) from public.subscriptions where status in ('active', 'trialing') and cancel_at_period_end),
    'signups', coalesce((select n from sign where d = p_day), 0),
    'best_signups_before', coalesce((select max(n) from sign where d < p_day), 0),
    'users', (select count(*) from public.profiles where created_at < v_to),
    'waitlist_new', (select count(*) from public.waitlist where created_at >= v_from and created_at < v_to),
    'waitlist', (select count(*) from public.waitlist where unsubscribed_at is null),
    'tests', coalesce((select n from tst where d = p_day), 0),
    'best_tests_before', coalesce((select max(n) from tst where d < p_day), 0),
    'customers', (select coalesce(sum(total), 0) from public.tests where status <> 'error' and created_at >= v_from and created_at < v_to),
    'customers_all', (select coalesce(sum(total), 0) from public.tests where status <> 'error' and created_at < v_to),
    'failed', (select count(*) from public.tests where status = 'error' and created_at >= v_from and created_at < v_to),
    'ai_cost', (select coalesce(sum(cost_usd), 0) from public.tests where created_at >= v_from and created_at < v_to),
    'sale_streak', (with recursive s(d, n) as (
        select p_day, 0 union all
        select s.d - 1, s.n + 1 from s where exists (select 1 from pay where pay.d = s.d and pay.cents > 0))
      select max(n) from s)
  ) into r;
  return r;
end $$;
revoke all on function public.ops_digest(date) from public, anon, authenticated;

-- Trigger functions and helpers are internal: nobody calls them from a browser.
revoke all on function public.ops_on_profile() from public, anon, authenticated;
revoke all on function public.ops_on_waitlist() from public, anon, authenticated;
revoke all on function public.ops_on_subscription() from public, anon, authenticated;
revoke all on function public.ops_on_payment() from public, anon, authenticated;
revoke all on function public.ops_on_test() from public, anon, authenticated;
revoke all on function public.ops_on_crawl() from public, anon, authenticated;
revoke all on function public.ops_mrr() from public, anon, authenticated;
revoke all on function public.ops_tz() from public, anon, authenticated;
revoke all on function public.mask_email(text) from public, anon, authenticated;
