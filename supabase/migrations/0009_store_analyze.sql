-- 0009: start_analyze takes a kind ('website' or 'store'). A store crawl remembers its kind in
-- crawls.data.input.kind, so the worker crawls product page -> cart instead of pricing -> signup.
drop function if exists public.start_analyze(text);

create function public.start_analyze(p_url text, p_kind text default 'website') returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_recent integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_url is null or length(p_url) > 2000 or p_url !~* '^https?://' then
    raise exception 'Please enter a valid website address.';
  end if;
  if p_kind is null or p_kind not in ('website', 'store') then
    raise exception 'Unknown kind of test.';
  end if;
  select count(*) into v_recent from public.crawls
   where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 30 and not coalesce((select is_admin from public.profiles where id = v_user), false) then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  perform public.check_job_cap(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, p_url, case when p_kind = 'store' then jsonb_build_object('input', jsonb_build_object('kind', 'store')) else null end);
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

revoke all on function public.start_analyze(text, text) from public, anon;
grant execute on function public.start_analyze(text, text) to authenticated;
