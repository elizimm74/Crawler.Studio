-- 0010: VIDEO tests (TikTok / Reels / Shorts / ads judged by simulated viewers).
-- The browser pulls still frames out of the video and uploads them as 1.jpg, 2.jpg...
-- to the user's own uploads folder (the 0003 storage policy already allows that).
-- start_video_analyze() checks everything strictly and queues an "analyze" job; the worker
-- sees the "video://" address and reads the frames. The test itself then runs through the
-- normal start_test() (same plan limits, same job cap).

create or replace function public.start_video_analyze(p_batch text, p_frames jsonb, p_meta jsonb)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_recent integer;
  v_duration numeric;
  v_platform text;
begin
  if v_user is null then raise exception 'Please sign in first.'; end if;
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

  select count(*) into v_recent from public.crawls
   where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 30 and not coalesce((select is_admin from public.profiles where id = v_user), false) then
    raise exception 'Too many analyses in the last hour. Please wait a bit.';
  end if;
  perform public.check_job_cap(v_user);

  v_id := public.short_id();
  insert into public.crawls (id, user_id, url, data)
  values (v_id, v_user, 'video://' || p_batch,
          jsonb_build_object('kind', 'video', 'input', jsonb_build_object(
            'batch', p_batch, 'frames', p_frames, 'times', p_meta -> 'times',
            'duration', v_duration, 'platform', v_platform)));
  insert into public.jobs (kind, ref_id, user_id, max_attempts) values ('analyze', v_id, v_user, 2);
  return v_id;
end $$;

revoke all on function public.start_video_analyze(text, jsonb, jsonb) from public, anon;
grant execute on function public.start_video_analyze(text, jsonb, jsonb) to authenticated;
