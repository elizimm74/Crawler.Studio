-- 0029: IDEA tests + QUICK CHECKS (2026-11-28, the founder: "support ideas" and "run simulations on
-- localhost for cheap").
--  1. start_idea_analyze(p_idea): an idea described in words (no website). Same guard as every other
--     analysis (analyze_guard: needs a runnable test, rate limits, job cap). The crawl's url is
--     'idea://<slug of the name>' and the worker turns the words into "pages" (src/lib/idea.ts).
--  2. start_test: paid plans / extra Crawlers may also pick 25 customers (a "quick check").
--     Free tests are unchanged (the server still decides their size).

create or replace function public.start_idea_analyze(p_idea jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_name text;
  v_pitch text;
  v_slug text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_idea is null or jsonb_typeof(p_idea) <> 'object' or pg_column_size(p_idea) > 8192 then
    raise exception 'That idea is too long.';
  end if;
  v_name := btrim(coalesce(p_idea ->> 'name', ''));
  v_pitch := btrim(coalesce(p_idea ->> 'pitch', ''));
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Give your idea a name (a working name is fine).'; end if;
  if length(v_pitch) < 30 or length(v_pitch) > 1500 then
    raise exception 'Describe the idea in at least a sentence or two: what it is and what problem it solves.';
  end if;
  if length(coalesce(p_idea ->> 'who', '')) > 300 or length(coalesce(p_idea ->> 'price', '')) > 200
     or length(coalesce(p_idea ->> 'how', '')) > 300 or length(coalesce(p_idea ->> 'alternatives', '')) > 300 then
    raise exception 'That idea is too long.';
  end if;
  perform public.analyze_guard(v_user);
  v_slug := left(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), 40);
  if v_slug = '' then v_slug := 'idea'; end if;
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, 'idea://' || v_slug,
          jsonb_build_object('kind', 'idea', 'input', jsonb_build_object(
            'kind', 'idea',
            'name', v_name, 'pitch', v_pitch,
            'who', coalesce(p_idea ->> 'who', ''), 'price', coalesce(p_idea ->> 'price', ''),
            'how', coalesce(p_idea ->> 'how', ''), 'alternatives', coalesce(p_idea ->> 'alternatives', ''))));
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;
revoke all on function public.start_idea_analyze(jsonb) from public, anon;
grant execute on function public.start_idea_analyze(jsonb) to authenticated;

-- ---------- start_test: allow 25 (quick check); everything else unchanged from 0025 ----------
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

  -- 25 = a QUICK CHECK (cheap, for trying changes on a local or preview build), new in 0029
  v_asked := case when (p_settings ->> 'count') in ('25', '100', '250', '500', '1000') then (p_settings ->> 'count')::integer else 100 end;
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
