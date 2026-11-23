-- 0020: real results get optional detail, so the accuracy page can show sample sizes honestly
-- (2026-11-23 overhaul). Both are optional; old rows stay valid.
alter table public.test_actuals add column if not exists visitors integer check (visitors is null or (visitors >= 1 and visitors <= 100000000));
alter table public.test_actuals add column if not exists period_days integer check (period_days is null or (period_days >= 1 and period_days <= 3650));

-- Same rules as before (your own finished test, 0-100%), plus the two optional numbers.
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
  insert into public.test_actuals (test_id, user_id, real_pct, visitors, period_days)
  values (p_test_id, v_user, p_real_pct, p_visitors, p_days)
  on conflict (test_id) do update set real_pct = excluded.real_pct, visitors = excluded.visitors, period_days = excluded.period_days, created_at = now();
end $$;
drop function if exists public.submit_actual(text, numeric);
revoke all on function public.submit_actual(text, numeric, integer, integer) from public, anon;
grant execute on function public.submit_actual(text, numeric, integer, integer) to authenticated;

-- Public list: still anonymous (type, predicted %, real %, simulated customers, real visitors, days, month).
create or replace function public.public_accuracy() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', case when t.data ->> 'kind' = 'app' then 'app' when t.data ->> 'kind' = 'video' then 'video' else 'website' end,
           'predicted', round(t.score::numeric / t.total * 100, 1),
           'real', a.real_pct,
           'simulated', t.total,
           'visitors', a.visitors,
           'days', a.period_days,
           'month', to_char(a.created_at, 'YYYY-MM')) order by a.created_at desc), '[]'::jsonb)
  from public.test_actuals a join public.tests t on t.id = a.test_id
  where t.total > 0 and t.score is not null
$$;
revoke all on function public.public_accuracy() from public;
grant execute on function public.public_accuracy() to anon, authenticated;
