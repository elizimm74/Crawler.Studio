-- 0018: who signs up, and where they came from (for marketing decisions).
-- 1. signup_answers: one row per account. The "About you" step in onboarding (all optional)
--    + where they first arrived from (link tags like ?utm_source=tiktok, and the referring site).
--    Ages start at 13: Crawler is for people 13 and older (no data from younger kids).
-- 2. save_signup_answers(jsonb): the only way to write. Signed-in user only, their own row, only
--    known answers kept; first answer wins (a later call only fills empty fields).
-- 3. marketing_insights(days): ADMIN ONLY. For each channel / age / role / stage: how many signed
--    up, how many ran a test, how many paid. Totals only, never individual people.
-- 4. ops_digest now also returns today's sources, for the Slack daily report.

create table public.signup_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age_range text check (age_range in ('13-17', '18-24', '25-34', '35-44', '45-54', '55+')),
  heard_from text check (heard_from in ('tiktok', 'instagram', 'x', 'youtube', 'reddit', 'linkedin', 'producthunt', 'google', 'ai', 'friend', 'other')),
  heard_other text check (char_length(heard_other) <= 80),
  role text check (role in ('student', 'solo', 'team', 'agency', 'marketer', 'creator', 'smallbiz', 'other')),
  stage text check (stage in ('idea', 'building', 'soon', 'live', 'growing')),
  goal text check (goal in ('signups', 'sales', 'paywall', 'ads', 'pricing', 'curious')),
  first_kind text check (first_kind in ('website', 'app', 'game', 'store', 'video')),
  utm_source text check (char_length(utm_source) <= 60),
  utm_medium text check (char_length(utm_medium) <= 60),
  utm_campaign text check (char_length(utm_campaign) <= 60),
  referrer_host text check (char_length(referrer_host) <= 100),
  landing_path text check (char_length(landing_path) <= 100),
  created_at timestamptz not null default now()
);
alter table public.signup_answers enable row level security;
create policy "Users can see their own answers" on public.signup_answers
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.save_signup_answers(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then return; end if;
  insert into public.signup_answers as s (
    user_id, age_range, heard_from, heard_other, role, stage, goal, first_kind,
    utm_source, utm_medium, utm_campaign, referrer_host, landing_path)
  values (
    v_user,
    case when p->>'age' in ('13-17', '18-24', '25-34', '35-44', '45-54', '55+') then p->>'age' end,
    case when p->>'heard' in ('tiktok', 'instagram', 'x', 'youtube', 'reddit', 'linkedin', 'producthunt', 'google', 'ai', 'friend', 'other') then p->>'heard' end,
    nullif(left(btrim(coalesce(p->>'heardOther', '')), 80), ''),
    case when p->>'role' in ('student', 'solo', 'team', 'agency', 'marketer', 'creator', 'smallbiz', 'other') then p->>'role' end,
    case when p->>'stage' in ('idea', 'building', 'soon', 'live', 'growing') then p->>'stage' end,
    case when p->>'goal' in ('signups', 'sales', 'paywall', 'ads', 'pricing', 'curious') then p->>'goal' end,
    case when p->>'kind' in ('website', 'app', 'game', 'store', 'video') then p->>'kind' end,
    nullif(lower(left(regexp_replace(coalesce(p->>'utmSource', ''), '[^A-Za-z0-9._-]', '', 'g'), 60)), ''),
    nullif(lower(left(regexp_replace(coalesce(p->>'utmMedium', ''), '[^A-Za-z0-9._-]', '', 'g'), 60)), ''),
    nullif(lower(left(regexp_replace(coalesce(p->>'utmCampaign', ''), '[^A-Za-z0-9._-]', '', 'g'), 60)), ''),
    nullif(lower(left(regexp_replace(coalesce(p->>'ref', ''), '[^A-Za-z0-9.-]', '', 'g'), 100)), ''),
    nullif(left(regexp_replace(coalesce(p->>'path', ''), '[^A-Za-z0-9/_-]', '', 'g'), 100), ''))
  on conflict (user_id) do update set
    age_range = coalesce(s.age_range, excluded.age_range),
    heard_from = coalesce(s.heard_from, excluded.heard_from),
    heard_other = coalesce(s.heard_other, excluded.heard_other),
    role = coalesce(s.role, excluded.role),
    stage = coalesce(s.stage, excluded.stage),
    goal = coalesce(s.goal, excluded.goal),
    first_kind = coalesce(s.first_kind, excluded.first_kind),
    utm_source = coalesce(s.utm_source, excluded.utm_source),
    utm_medium = coalesce(s.utm_medium, excluded.utm_medium),
    utm_campaign = coalesce(s.utm_campaign, excluded.utm_campaign),
    referrer_host = coalesce(s.referrer_host, excluded.referrer_host),
    landing_path = coalesce(s.landing_path, excluded.landing_path);
end $$;
revoke all on function public.save_signup_answers(jsonb) from public, anon;
grant execute on function public.save_signup_answers(jsonb) to authenticated;

-- ADMIN ONLY: totals per answer, with how many of those people ran a test and how many paid.
create or replace function public.marketing_insights(p_days integer default 90) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 90), 3650)));
  r jsonb;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Admins only.';
  end if;
  with people as (
    select p.id, p.created_at,
           a.age_range, a.heard_from, a.role, a.stage, a.goal, a.first_kind,
           coalesce(a.utm_source, '') utm_source, coalesce(a.referrer_host, '') referrer_host,
           exists (select 1 from public.tests t where t.user_id = p.id and t.status <> 'error') as tested,
           exists (select 1 from public.subscriptions s where s.user_id = p.id and s.status in ('active', 'trialing', 'past_due', 'canceled'))
             or exists (select 1 from public.payments pm where pm.user_id = p.id) as paid,
           a.user_id is not null as answered
      from public.profiles p
      left join public.signup_answers a on a.user_id = p.id
     where p.created_at >= v_since and not coalesce(p.is_admin, false)
  ), grouped as (
    select dim, coalesce(val, 'not answered') val, count(*) n, count(*) filter (where tested) tested, count(*) filter (where paid) paid
      from (
        select 'heard_from' dim, heard_from val, tested, paid from people
        union all select 'age', age_range, tested, paid from people
        union all select 'role', role, tested, paid from people
        union all select 'stage', stage, tested, paid from people
        union all select 'goal', goal, tested, paid from people
        union all select 'first_kind', first_kind, tested, paid from people
        union all select 'utm_source', nullif(utm_source, ''), tested, paid from people
        union all select 'referrer', nullif(referrer_host, ''), tested, paid from people
      ) x
     group by dim, coalesce(val, 'not answered')
  )
  select jsonb_build_object(
    'days', p_days,
    'signups', (select count(*) from people),
    'answered', (select count(*) from people where answered),
    'tested', (select count(*) from people where tested),
    'paid', (select count(*) from people where paid),
    'groups', coalesce((select jsonb_object_agg(dim, rows) from (
        select dim, jsonb_agg(jsonb_build_object('value', val, 'n', n, 'tested', tested, 'paid', paid) order by n desc, val) rows
          from grouped group by dim) g), '{}'::jsonb),
    'other', coalesce((select jsonb_agg(heard_other order by created_at desc) from (
        select a.heard_other, a.created_at from public.signup_answers a join people on people.id = a.user_id
         where a.heard_other is not null order by a.created_at desc limit 30) o), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.marketing_insights(integer) from public, anon;
grant execute on function public.marketing_insights(integer) to authenticated;

-- Slack daily report: where today's sign-ups said they came from (answered ones only).
create or replace function public.ops_sources(p_day date) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(heard_from, n), '{}'::jsonb) from (
    select a.heard_from, count(*) n from public.signup_answers a
     where a.heard_from is not null
       and (a.created_at at time zone public.ops_tz())::date = p_day
     group by 1) s
$$;
revoke all on function public.ops_sources(date) from public, anon, authenticated;
