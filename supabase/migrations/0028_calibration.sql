-- 0028: CALIBRATION (engine v2, 2026-11-27).
-- A founder adds the REAL conversion rate of a tested page -> a 'calibrate' job -> the worker
-- refits how far Crawler's predictions are from reality (src/lib/calibration.ts) and LOGS it.
-- Every calibration is kept (history), so accuracy over time can be published (/accuracy).

-- 1. A third kind of job. It doesn't count toward the 4-running-tests cap.
alter table public.jobs drop constraint if exists jobs_kind_check;
alter table public.jobs add constraint jobs_kind_check check (kind in ('analyze', 'run', 'calibrate'));

create or replace function public.check_job_cap(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select is_admin from public.profiles where id = p_user), false) then return; end if;
  if (select count(*) from public.jobs where user_id = p_user and kind in ('analyze', 'run') and status in ('queued', 'running')) >= 4 then
    raise exception 'You already have several tests running. Please wait for one to finish.';
  end if;
end $$;
revoke all on function public.check_job_cap(uuid) from public, anon, authenticated;

-- 2. The log: one row per calibration (a re-submitted real result supersedes the older row).
create table public.calibration_runs (
  id bigint generated always as identity primary key,
  test_id text references public.tests (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null, -- kept anonymous after an account is deleted
  host text,
  created_at timestamptz not null default now(),
  engine integer not null default 1,
  kind text not null default 'website',
  goal text,
  simulated integer,               -- crowd size
  stated_pct numeric,              -- % of the crowd that SAID yes
  raw_pct numeric,                 -- predicted % before any calibration (say-vs-do priors only)
  shown_pct numeric,               -- predicted % the report showed (with the calibration it used then)
  loo_pct numeric,                 -- predicted % with a calibration fitted WITHOUT this result (the honest one)
  real_pct numeric not null,
  visitors integer,
  period_days integer,
  site_delta numeric,              -- the shift that makes THIS crowd match THIS site
  error_pp numeric,                -- |loo - real| in percentage points
  within_margin boolean,
  used_in_fit boolean not null default false,
  superseded boolean not null default false,
  excluded boolean not null default false, -- admins can exclude a result they believe is wrong
  p jsonb                          -- the crowd's per-person probabilities (to refit without the AI)
);
create index calibration_runs_current on public.calibration_runs (superseded, excluded, engine);
create index calibration_runs_user on public.calibration_runs (user_id, host);
alter table public.calibration_runs enable row level security;
create policy "Users can read their own calibrations" on public.calibration_runs
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.calibration_runs from anon, authenticated;
grant select (id, test_id, user_id, host, created_at, engine, kind, goal, simulated, stated_pct, raw_pct, shown_pct, loo_pct,
              real_pct, visitors, period_days, site_delta, error_pp, within_margin, used_in_fit, superseded)
  on public.calibration_runs to authenticated;

-- 3. The current global calibration (one row), written only by the worker.
create table public.calibration_state (
  id integer primary key default 1 check (id = 1),
  engine integer not null default 2,
  delta numeric not null default 0,
  sd numeric not null default 0.7,
  n integer not null default 0,
  users integer not null default 0,
  accuracy jsonb not null default '{}'::jsonb,
  fitted_at timestamptz not null default now()
);
insert into public.calibration_state (id) values (1);
alter table public.calibration_state enable row level security;
revoke all on public.calibration_state from anon, authenticated;

-- 4. Adding a real result also queues a calibration (one waiting at a time per test, max 20 an hour).
create or replace function public.submit_actual(p_test_id text, p_real_pct numeric, p_visitors integer default null, p_days integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_real_pct is null or p_real_pct < 0 or p_real_pct > 100 then raise exception 'Please enter a percentage from 0 to 100.'; end if;
  if p_visitors is not null and (p_visitors < 1 or p_visitors > 100000000) then raise exception 'Please enter a real number of visitors.'; end if;
  if p_days is not null and (p_days < 1 or p_days > 3650) then raise exception 'Please enter the number of days (1 or more).'; end if;
  if not exists (select 1 from public.tests where id = p_test_id and user_id = v_user and status = 'done') then
    raise exception 'That test was not found, or it is not finished yet.';
  end if;
  if (select count(*) from public.jobs where user_id = v_user and kind = 'calibrate' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many real results in the last hour. Please wait a bit.';
  end if;
  insert into public.test_actuals (test_id, user_id, real_pct, visitors, period_days)
  values (p_test_id, v_user, p_real_pct, p_visitors, p_days)
  on conflict (test_id) do update set real_pct = excluded.real_pct, visitors = excluded.visitors, period_days = excluded.period_days, created_at = now();
  if not exists (select 1 from public.jobs where kind = 'calibrate' and ref_id = p_test_id and status = 'queued') then
    insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('calibrate', p_test_id, v_user, 3);
  end if;
end $$;
revoke all on function public.submit_actual(text, numeric, integer, integer) from public, anon;
grant execute on function public.submit_actual(text, numeric, integer, integer) to authenticated;

-- 5. Stale-job cleanup must not touch tests/crawls for a calibrate job.
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
    elsif r.kind = 'analyze' then
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
grant execute on function public.claim_job(text) to service_role;

-- 6. Public, anonymous: the current calibration + the accuracy log (no ids, hosts or users).
create or replace function public.public_calibration() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'state', (select jsonb_build_object('engine', engine, 'delta', round(delta, 3), 'sd', round(sd, 3), 'n', n, 'users', users,
                                        'accuracy', accuracy, 'fittedAt', fitted_at) from public.calibration_state where id = 1),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
              'month', to_char(c.created_at, 'YYYY-MM'), 'kind', c.kind, 'goal', c.goal, 'engine', c.engine,
              'simulated', c.simulated, 'stated', c.stated_pct, 'raw', c.raw_pct, 'loo', c.loo_pct, 'real', c.real_pct,
              'visitors', c.visitors, 'days', c.period_days, 'errorPp', c.error_pp, 'within', c.within_margin, 'usedInFit', c.used_in_fit)
              order by c.created_at desc)
            from public.calibration_runs c where not c.superseded and not c.excluded), '[]'::jsonb))
$$;
revoke all on function public.public_calibration() from public;
grant execute on function public.public_calibration() to anon, authenticated;

-- 7. (applied as 0028b) Old workers call claim_job(text) and only know 'analyze' + 'run': they must never
-- get a 'calibrate' job (old code would run it as a full test). New workers call claim_job_kinds.
create or replace function public.claim_job_kinds(p_worker text, p_kinds text[]) returns setof public.jobs
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
    elsif r.kind = 'analyze' then
      update public.crawls set status = 'error', error = 'The analysis stopped unexpectedly. Please try again.', updated_at = now() where id = r.ref_id;
    end if;
  end loop;

  return query
  update public.jobs j
     set status = 'running', attempts = j.attempts + 1, locked_by = p_worker,
         locked_at = now(), heartbeat_at = now(), updated_at = now()
   where j.id = (
     select id from public.jobs
      where kind = any (p_kinds)
        and (status = 'queued'
         or (status = 'running' and heartbeat_at < now() - interval '5 minutes' and attempts < max_attempts))
      order by created_at - make_interval(mins => priority * 2), id
      for update skip locked
      limit 1)
  returning j.*;
end $$;
revoke all on function public.claim_job_kinds(text, text[]) from public, anon, authenticated;
grant execute on function public.claim_job_kinds(text, text[]) to service_role;

create or replace function public.claim_job(p_worker text) returns setof public.jobs
language sql security definer set search_path = '' as $$
  select * from public.claim_job_kinds(p_worker, array['analyze', 'run'])
$$;
revoke all on function public.claim_job(text) from public, anon, authenticated;
grant execute on function public.claim_job(text) to service_role;
