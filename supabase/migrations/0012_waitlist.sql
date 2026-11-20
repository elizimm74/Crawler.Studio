-- 0012: the launch WAITLIST (name + email, from the public landing page).
-- Anyone can JOIN or UNSUBSCRIBE, but nobody can READ the list from a browser: the table has row
-- level security and NO policies, and the only way in is the security-definer functions below.
-- You read the list in the Supabase dashboard (Table Editor) or with the service key (scripts/send-launch-email.cjs).
--   - emails are stored lowercase; one row per email (re-joining updates the name)
--   - someone who unsubscribed STAYS unsubscribed even if somebody else types their email again
--   - join_waitlist never says whether an email was already on the list (no probing)
--   - a flood guard stops a script from filling the list: max 300 sign-ups per hour overall

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) <= 254),
  source text not null default 'landing' check (char_length(source) <= 40),
  token uuid not null default gen_random_uuid(), -- the secret in the unsubscribe link
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  launch_emailed_at timestamptz -- set by the send script, so nobody gets the launch email twice
);
create unique index waitlist_email_key on public.waitlist (lower(email));
create unique index waitlist_token_key on public.waitlist (token);
alter table public.waitlist enable row level security;
revoke all on table public.waitlist from anon, authenticated;

create function public.join_waitlist(p_name text, p_email text, p_source text default 'landing')
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_source text := case when p_source in ('landing', 'overview', 'share') then p_source else 'landing' end;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80
     or char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter your name and a valid email.';
  end if;
  if (select count(*) from public.waitlist where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Lots of people are joining right now. Please try again in a few minutes.';
  end if;
  insert into public.waitlist (name, email, source) values (v_name, v_email, v_source)
  on conflict (lower(email)) do update set name = excluded.name
    where public.waitlist.unsubscribed_at is null;
end $$;

create function public.unsubscribe_waitlist(p_token uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.waitlist set unsubscribed_at = coalesce(unsubscribed_at, now()) where token = p_token;
  return found;
end $$;

-- How many people are on the list (just a number; the page only shows it once it's worth showing).
create function public.waitlist_count()
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.waitlist where unsubscribed_at is null
$$;

revoke all on function public.join_waitlist(text, text, text) from public;
revoke all on function public.unsubscribe_waitlist(uuid) from public;
revoke all on function public.waitlist_count() from public;
grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;
grant execute on function public.unsubscribe_waitlist(uuid) to anon, authenticated;
grant execute on function public.waitlist_count() to anon, authenticated;
