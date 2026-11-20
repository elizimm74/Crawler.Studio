-- 0011: long app onboardings (30+ screens, Cal AI-style). The AI reads at most 100 images per
-- request, so the cap is 95 screens for version A (+ up to 5 for version B). File names may now
-- have 3 digits. Everything else in start_app_analyze is unchanged.
create or replace function public.start_app_analyze(p_batch text, p_screens jsonb, p_screens_b jsonb default '[]'::jsonb)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_recent integer;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
  if p_batch is null or p_batch !~ '^[a-z0-9]{8,40}$' then raise exception 'Bad upload id.'; end if;
  if jsonb_typeof(p_screens) <> 'array' or jsonb_array_length(p_screens) < 1 or jsonb_array_length(p_screens) > 95 then
    raise exception 'Please upload between 1 and 95 screens.';
  end if;
  if jsonb_typeof(p_screens_b) <> 'array' or jsonb_array_length(p_screens_b) > 5 then
    raise exception 'Version B can have up to 5 screens.';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_screens || p_screens_b) f where f !~ '^b?[0-9]{1,3}\.jpg$'
  ) then
    raise exception 'Bad screen file name.';
  end if;
  select count(*) into v_recent from public.crawls
   where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 30 and not coalesce((select is_admin from public.profiles where id = v_user), false) then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  perform public.check_job_cap(v_user);
  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, 'app://' || p_batch,
          jsonb_build_object('kind', 'app', 'input', jsonb_build_object('batch', p_batch, 'screens', p_screens, 'screensB', p_screens_b)));
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;
