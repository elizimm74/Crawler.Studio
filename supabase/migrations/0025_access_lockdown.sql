-- 0025 ACCESS LOCKDOWN + HIGHER PAY-PER-ANALYSIS PRICES (2026-11-27, founder: "raise the one-time
-- simulations; make sure the access points are all good so people can't access certain things with
-- certain plans, no hacks or get-arounds").
--
-- Anyone can talk to the database directly with the PUBLIC key (that's how Supabase works), so every
-- plan rule must live HERE, not only in the website. This migration closes the gaps an audit found:
--
--  1. FREE-TRIAL REPORTS were only hidden by the website: the full report sat in tests.data, which a
--     signed-in person could read straight from the database. Now `data` (and the private cost) can't
--     be selected by users at all; reports come from test_report(), which returns the PREVIEW for a
--     locked trial (the same trimming as src/lib/preview.ts) and the full report otherwise.
--     The dashboard and My tests read my_tests(), which hides a locked trial's fixes.
--  2. VIDEO / AD analyses could be STARTED on any plan (only the final test was blocked), so the AI
--     still read the frames for free. start_video_analyze now needs Ad Analysis (Growth and up).
--  3. ANALYSES could be started forever after the free test was used up (AI cost, no test possible).
--     Every start_*_analyze now needs a test the person can actually run (can_analyze), plus a daily cap.
--  4. Questions about a LOCKED trial report were only blocked by the website: ask_test checks it too.
--  5. start_test refuses giant settings (a direct call could paste megabytes into the AI prompts).
--  6. Uploads: the screenshots bucket now only takes images up to 10 MB.
--  7. Table permissions trimmed to what's really used (no direct inserts/updates/deletes/truncate by
--     users or anonymous visitors; Row Level Security already blocked them, this is a second lock).
--  8. Pay per analysis prices raised: 100 $9 · 250 $19 · 500 $29 · 1,000 $49 (src/lib/plans.ts PACKS).

-- ---------- 8. prices ----------
create or replace function public.pack_price_cents(p_pack text) returns integer
language sql immutable set search_path = '' as $$
  select case p_pack
    when 'test100' then 900 when 'test250' then 1900 when 'test500' then 2900 when 'test1000' then 4900
    when 'pack500' then 900 when 'pack2000' then 2900 when 'pack10000' then 9900 when 'pack25000' then 19900
    else 0 end
$$;

-- ---------- 7. table permissions ----------
revoke all on table public.crawls, public.jobs, public.payments, public.profiles, public.purchases,
  public.referrals, public.saved_audiences, public.signup_answers, public.subscriptions,
  public.test_actuals, public.test_messages, public.tests, public.sales_requests, public.waitlist,
  public.ops_events, public.ops_state from anon;
revoke insert, update, delete, truncate, references, trigger on table public.crawls, public.jobs,
  public.payments, public.profiles, public.purchases, public.referrals, public.signup_answers,
  public.subscriptions, public.test_actuals, public.test_messages, public.tests, public.sales_requests,
  public.waitlist, public.ops_events, public.ops_state from authenticated;
revoke truncate, references, trigger on table public.saved_audiences from authenticated;
revoke select on table public.jobs, public.sales_requests, public.waitlist, public.ops_events, public.ops_state from authenticated;

-- ---------- 1. tests: everything except the report and the cost ----------
revoke select on table public.tests from authenticated;
grant select (id, user_id, url, goal, status, score, total, created_at, updated_at, crawl_id, stage,
  progress, error, share_token, pack_used, tier) on table public.tests to authenticated;

-- Is this test a free-trial report its owner hasn't unlocked yet?
create or replace function public.trial_locked(p_tier text, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_tier = 'trial' and not public.has_paid(p_user)
$$;
revoke all on function public.trial_locked(text, uuid) from public, anon, authenticated;

-- The preview of a report: score, summary and the top 3 reasons people said no.
-- KEEP IN SYNC with toPreview() in src/lib/preview.ts.
create or replace function public.report_preview(p_data jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  with s as (select coalesce(p_data -> 'stats', '{}'::jsonb) as stats, coalesce(p_data -> 'advice', '{}'::jsonb) as advice)
  select (p_data - 'journey' - 'reputation') || jsonb_build_object(
    'verdicts', '[]'::jsonb,
    'personas', '[]'::jsonb,
    'checks', case when jsonb_typeof(p_data -> 'checks') = 'array' then '[]'::jsonb else coalesce(p_data -> 'checks', 'null'::jsonb) end,
    'checksB', 'null'::jsonb,
    'stats', s.stats || jsonb_build_object(
      'objections', coalesce((
        select jsonb_agg(o || jsonb_build_object(
                 'examples', coalesce((select jsonb_agg(e) from (select e from jsonb_array_elements(case when jsonb_typeof(o -> 'examples') = 'array' then o -> 'examples' else '[]'::jsonb end) e limit 1) x), '[]'::jsonb),
                 'changeMind', '[]'::jsonb) order by ord)
          from jsonb_array_elements(case when jsonb_typeof(s.stats -> 'objections') = 'array' then s.stats -> 'objections' else '[]'::jsonb end) with ordinality t(o, ord)
         where ord <= 3), '[]'::jsonb),
      'bestQuotes', coalesce((select jsonb_agg(q order by ord) from jsonb_array_elements(case when jsonb_typeof(s.stats -> 'bestQuotes') = 'array' then s.stats -> 'bestQuotes' else '[]'::jsonb end) with ordinality t(q, ord) where ord <= 2), '[]'::jsonb),
      'allQuotes', '[]'::jsonb),
    'advice', jsonb_build_object('summary', coalesce(s.advice ->> 'summary', ''), 'fixes', '[]'::jsonb,
                                 'headlineOptions', '[]'::jsonb, 'subheadline', '', 'pricingCopy', ''),
    'preview', jsonb_build_object(
      'fixes', case when jsonb_typeof(s.advice -> 'fixes') = 'array' then jsonb_array_length(s.advice -> 'fixes') else 0 end,
      'customers', coalesce(nullif(s.stats ->> 'total', '')::numeric,
                            coalesce(nullif(s.stats ->> 'perSample', '')::numeric, 0) * coalesce(nullif(s.stats ->> 'samples', '')::numeric, 1))::integer))
  from s
$$;
revoke all on function public.report_preview(jsonb) from public, anon, authenticated;

-- One of YOUR tests' saved report: the full one, or the preview while a free trial is locked.
-- null = not found / not yours. Costs are removed (they're private).
create or replace function public.test_report(p_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_row public.tests;
begin
  if v_user is null then return null; end if;
  select * into v_row from public.tests where id = p_id and user_id = v_user;
  if not found or v_row.data is null then return null; end if;
  if public.trial_locked(v_row.tier, v_user) and v_row.data ? 'stats' then
    return public.report_preview(v_row.data - 'costs' - 'totalCostUsd');
  end if;
  return v_row.data - 'costs' - 'totalCostUsd';
end $$;
revoke all on function public.test_report(text) from public, anon;
grant execute on function public.test_report(text) to authenticated;

-- The small parts of YOUR tests the dashboard and My tests need (newest first, at most 100).
-- A locked trial's fixes stay hidden.
create or replace function public.my_tests(p_limit integer default 100)
returns table (id text, url text, goal text, status text, score integer, total integer, created_at timestamptz,
               crawl_id text, tier text, kind text, ptype text, objections jsonb, fixes jsonb)
language sql stable security definer set search_path = '' as $$
  select t.id, t.url, t.goal, t.status, t.score, t.total, t.created_at, t.crawl_id, t.tier,
         t.data ->> 'kind', t.data -> 'profile' ->> 'productType', t.data -> 'stats' -> 'objections',
         case when public.trial_locked(t.tier, t.user_id) then null else t.data -> 'advice' -> 'fixes' end
    from public.tests t
   where t.user_id = auth.uid()
   order by t.created_at desc
   limit least(greatest(coalesce(p_limit, 100), 1), 100)
$$;
revoke all on function public.my_tests(integer) from public, anon;
grant execute on function public.my_tests(integer) to authenticated;

-- ---------- 3. can this person run a test at all? (used before any AI work starts) ----------
create or replace function public.can_analyze(p_user uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_used integer;
begin
  select * into v_profile from public.profiles where id = p_user;
  if not found then return true; end if; -- a brand-new account: its free test is still there
  if v_profile.is_admin then return true; end if;
  if public.live_sub(p_user) is not null and (public.live_sub(p_user)).id is not null then return true; end if;
  if v_profile.pack_crawlers > 0 then return true; end if;
  select count(*) into v_used from public.tests where user_id = p_user and status <> 'error';
  return v_used < public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
                + case when public.verified_referrals(p_user) >= public.referrals_needed() then 1 else 0 end;
end $$;
revoke all on function public.can_analyze(uuid) from public, anon, authenticated;

-- Ad Analysis (video / ad / creator tests): Growth and up (or an old sandbox plan that had it).
create or replace function public.can_analyze_video(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = p_user), false)
      or coalesce(public.plan_has_ads((public.live_sub(p_user)).plan_id), false)
      or coalesce((select plan in ('launch', 'studio') from public.profiles where id = p_user), false)
$$;
revoke all on function public.can_analyze_video(uuid) from public, anon, authenticated;

-- The shared checks every start_*_analyze runs: signed in, has a test to use, not flooding.
create or replace function public.analyze_guard(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_admin boolean := coalesce((select is_admin from public.profiles where id = p_user), false);
begin
  if p_user is null then raise exception 'Please sign in first.'; end if;
  if v_admin then return; end if;
  if not public.can_analyze(p_user) then raise exception 'NO_TESTS_LEFT'; end if;
  if (select count(*) from public.crawls where user_id = p_user and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  if (select count(*) from public.crawls where user_id = p_user and created_at > now() - interval '1 day') >= 120 then
    raise exception 'Too many analyses today. Please try again tomorrow.';
  end if;
  perform public.check_job_cap(p_user);
end $$;
revoke all on function public.analyze_guard(uuid) from public, anon, authenticated;

create or replace function public.start_analyze(p_url text, p_kind text default 'website')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_url is null or length(p_url) > 2000 or p_url !~* '^https?://' then
    raise exception 'Please enter a valid website address.';
  end if;
  if p_kind is null or p_kind not in ('website', 'store') then raise exception 'Unknown kind of test.'; end if;
  perform public.analyze_guard(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, p_url, case when p_kind = 'store' then jsonb_build_object('input', jsonb_build_object('kind', 'store')) else null end);
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

create or replace function public.start_app_analyze(p_batch text, p_screens jsonb, p_screens_b jsonb default '[]'::jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_batch is null or p_batch !~ '^[a-z0-9]{8,40}$' then raise exception 'Bad upload id.'; end if;
  if jsonb_typeof(p_screens) <> 'array' or jsonb_array_length(p_screens) < 1 or jsonb_array_length(p_screens) > 95 then
    raise exception 'Please upload between 1 and 95 screens.';
  end if;
  if jsonb_typeof(p_screens_b) <> 'array' or jsonb_array_length(p_screens_b) > 5 then
    raise exception 'Version B can have up to 5 screens.';
  end if;
  if exists (select 1 from jsonb_array_elements_text(p_screens || p_screens_b) f where f !~ '^b?[0-9]{1,3}\.jpg$') then
    raise exception 'Bad screen file name.';
  end if;
  perform public.analyze_guard(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, 'app://' || p_batch,
          jsonb_build_object('kind', 'app', 'input', jsonb_build_object('batch', p_batch, 'screens', p_screens, 'screensB', p_screens_b)));
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

create or replace function public.start_video_analyze(p_batch text, p_frames jsonb, p_meta jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_duration numeric;
  v_platform text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if not public.can_analyze_video(v_user) then raise exception 'PLAN_NO_ADS'; end if;
  if p_batch is null or p_batch !~ '^[a-z0-9]{8,40}$' then raise exception 'Bad upload id.'; end if;
  if jsonb_typeof(p_frames) <> 'array' or jsonb_array_length(p_frames) < 2 or jsonb_array_length(p_frames) > 16 then
    raise exception 'A video needs between 2 and 16 frames.';
  end if;
  if exists (select 1 from jsonb_array_elements_text(p_frames) f where f !~ '^[0-9]{1,2}\.jpg$') then
    raise exception 'Bad frame file name.';
  end if;
  if jsonb_typeof(p_meta) <> 'object'
     or jsonb_typeof(p_meta -> 'times') <> 'array'
     or jsonb_array_length(p_meta -> 'times') <> jsonb_array_length(p_frames)
     or exists (select 1 from jsonb_array_elements(p_meta -> 'times') t where jsonb_typeof(t) <> 'number' or (t)::text::numeric < 0 or (t)::text::numeric > 600)
  then
    raise exception 'Bad frame times.';
  end if;
  if jsonb_typeof(p_meta -> 'duration') <> 'number' then raise exception 'Bad video length.'; end if;
  v_duration := (p_meta ->> 'duration')::numeric;
  if v_duration <= 0 or v_duration > 600 then raise exception 'Videos can be up to 10 minutes long.'; end if;
  v_platform := p_meta ->> 'platform';
  if v_platform is null or v_platform not in ('TikTok', 'Instagram Reels', 'YouTube Shorts', 'YouTube', 'X') then
    raise exception 'Unknown platform.';
  end if;
  perform public.analyze_guard(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, 'video://' || p_batch,
          jsonb_build_object('kind', 'video', 'input', jsonb_build_object(
            'batch', p_batch, 'frames', p_frames, 'times', p_meta -> 'times',
            'duration', v_duration, 'platform', v_platform)));
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

-- ---------- 4. no questions about a locked trial report ----------
create or replace function public.ask_test(p_test_id text, p_content text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_admin boolean;
  v_used integer;
  v_last text;
  v_tier text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_content is null or char_length(btrim(p_content)) < 1 or char_length(p_content) > 600 then
    raise exception 'Please write a question between 1 and 600 characters.';
  end if;
  select tier into v_tier from public.tests where id = p_test_id and user_id = v_user and status = 'done';
  if not found then raise exception 'That test was not found, or it is not finished yet.'; end if;
  if public.trial_locked(v_tier, v_user) then raise exception 'REPORT_LOCKED'; end if;

  select role into v_last from public.test_messages
   where test_id = p_test_id and user_id = v_user order by id desc limit 1;
  if v_last = 'user' then raise exception 'Please wait for the answer to your last question.'; end if;

  select coalesce(is_admin, false) into v_admin from public.profiles where id = v_user;
  select count(*) into v_used from public.test_messages
   where test_id = p_test_id and user_id = v_user and role = 'user';
  if not coalesce(v_admin, false) and v_used >= public.free_test_messages() then
    raise exception 'CHAT_LIMIT';
  end if;

  insert into public.test_messages (test_id, user_id, role, content)
  values (p_test_id, v_user, 'user', btrim(p_content));
  return case when coalesce(v_admin, false) then null else public.free_test_messages() - v_used - 1 end;
end $$;

-- ---------- 5. start_test: refuse giant settings (everything else unchanged from 0023) ----------
create or replace function public.start_test(p_crawl_id text, p_settings jsonb, p_secret text default null)
returns text language plpgsql security definer set search_path = '' as $$
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
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' or pg_column_size(p_settings) > 65536 then
    raise exception 'Those test settings are too large.';
  end if;
  if p_secret is not null and length(p_secret) > 4096 then raise exception 'Bad login details.'; end if;
  select * into v_crawl from public.crawls where id = p_crawl_id and user_id = v_user;
  if not found then raise exception 'That analysis was not found. Analyze the URL again.'; end if;
  if v_crawl.status <> 'done' then raise exception 'The analysis is not finished yet.'; end if;
  -- the test's kind follows the analysis it runs on (a video analysis can't run as a cheaper website test, and back)
  v_video := v_video or coalesce(v_crawl.data ->> 'kind', '') = 'video';

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    insert into public.profiles (id) values (v_user) returning * into v_profile;
  end if;

  v_asked := case when (p_settings ->> 'count') in ('100', '250', '500', '1000') then (p_settings ->> 'count')::integer else 100 end;
  v_sub := public.live_sub(v_user);

  if v_profile.is_admin then
    v_count := v_asked;
  elsif v_sub.id is not null or v_profile.pack_crawlers > 0 then
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
    perform public.check_job_cap(v_user);
    if v_video and v_profile.plan not in ('launch', 'studio') then raise exception 'PLAN_NO_ADS'; end if;
    select count(*) into v_used from public.tests where user_id = v_user and status <> 'error';
    v_allowed := public.plan_test_limit(v_profile.plan) + v_profile.bonus_tests
                 + case when public.verified_referrals(v_user) >= public.referrals_needed() then 1 else 0 end;
    if v_used >= v_allowed then raise exception 'LIMIT_REACHED'; end if;
    v_count := public.test_size_for(v_user);
    if v_used = 0 and v_profile.plan = 'free' and v_profile.bonus_tests <= 0 then v_tier := 'trial'; end if;
  end if;

  v_id := public.short_id();
  insert into public.tests (id, user_id, crawl_id, url, goal, status, total, pack_used, tier, data)
  values (v_id, v_user, p_crawl_id, v_crawl.url, left(p_settings #>> '{profile,goal}', 200), 'queued', v_count, v_pack, v_tier,
          jsonb_build_object('settings', p_settings || jsonb_build_object('count', v_count)));
  insert into public.jobs (kind, ref_id, user_id, secret, max_attempts) values ('run', v_id, v_user, p_secret, 2);
  return v_id;
end $$;

-- ---------- 6. uploads: images only, 10 MB each ----------
update storage.buckets
   set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'screenshots';
