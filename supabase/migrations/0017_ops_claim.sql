-- 0017: so a Slack message is never posted twice, even with 2+ workers running.
-- ops_claim_events: takes up to N unsent events and marks them sent in ONE step (others skip them).
-- ops_unclaim_event: puts one back if Slack didn't accept it (it'll be retried).
-- ops_claim_digest: only the first worker to ask gets to post a given day's report.
create or replace function public.ops_claim_events(p_limit integer default 20)
returns setof public.ops_events
language sql security definer set search_path = '' as $$
  update public.ops_events e set sent_at = now()
   where e.id in (select id from public.ops_events where sent_at is null order by id
                  limit greatest(1, least(p_limit, 100)) for update skip locked)
  returning e.*
$$;
create or replace function public.ops_unclaim_event(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.ops_events set sent_at = null where id = p_id
$$;
create or replace function public.ops_claim_digest(p_day date) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ops_state as s (key, value) values ('digest_last', to_jsonb(p_day::text))
  on conflict (key) do update set value = excluded.value where s.value is distinct from excluded.value;
  return found;
end $$;
revoke all on function public.ops_claim_events(integer) from public, anon, authenticated;
revoke all on function public.ops_unclaim_event(bigint) from public, anon, authenticated;
revoke all on function public.ops_claim_digest(date) from public, anon, authenticated;
