-- 0008: one-time pack purchases (Stripe Checkout).
-- 1. purchases: one row per paid Stripe Checkout session. The session id is the primary key,
--    so if Stripe sends the same webhook twice, the second insert does nothing (no double tests).
-- 2. record_purchase(): the ONLY way a purchase is written. Service role only (the Stripe
--    webhook route calls it after checking Stripe's signature). Adds the tests via grant_tests().
-- 3. my_plan(): now says plan "pack" once someone has bought, so the dashboard stops showing
--    the free-plan invite card. Counting stays all-time (packs never expire).

create table public.purchases (
  id text primary key,                       -- Stripe Checkout session id (cs_...)
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (plan_id in ('launch', 'studio')),
  tests integer not null check (tests > 0 and tests <= 100),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  created_at timestamptz not null default now()
);
create index purchases_user_idx on public.purchases (user_id);
alter table public.purchases enable row level security;
create policy "Users can see their own purchases" on public.purchases
  for select to authenticated using (user_id = (select auth.uid()));

create function public.record_purchase(p_session text, p_user uuid, p_plan text, p_tests integer, p_amount integer, p_currency text default 'usd')
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_session is null or p_session !~ '^cs_[A-Za-z0-9_]{8,200}$' then raise exception 'Bad session id.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown user.'; end if;
  insert into public.purchases (id, user_id, plan_id, tests, amount_cents, currency)
  values (p_session, p_user, p_plan, p_tests, p_amount, coalesce(p_currency, 'usd'))
  on conflict (id) do nothing;
  if not found then return false; end if;      -- already counted: Stripe retried the webhook
  perform public.grant_tests(p_user, p_tests);
  return true;
end $$;
revoke all on function public.record_purchase(text, uuid, text, integer, integer, text) from public, anon, authenticated;

create or replace function public.my_plan() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_refs integer;
  v_used integer;
  v_limit integer;
  v_bought boolean;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  select * into v_profile from public.profiles where id = v_user;
  v_refs := public.verified_referrals(v_user);
  v_bought := exists (select 1 from public.purchases where user_id = v_user);
  select count(*) into v_used from public.tests
   where user_id = v_user and status <> 'error'
     and (v_profile.plan in ('free', 'launch') or created_at >= date_trunc('month', now()));
  v_limit := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
             + case when v_refs >= public.referrals_needed() then 1 else 0 end;
  return jsonb_build_object(
    'plan', case when v_bought and v_profile.plan = 'free' then 'pack' else v_profile.plan end,
    'unlimited', coalesce(v_profile.is_admin, false),
    'customers', public.test_size_for(v_user),
    'used', v_used,
    'limit', v_limit,
    'left', greatest(0, v_limit - v_used),
    'referrals', jsonb_build_object('count', v_refs, 'needed', public.referrals_needed(), 'code', v_profile.referral_code));
end $$;
