-- 0023: the early-access waitlist, v2.
--   - first name is OPTIONAL now (the email script already greets "there")
--   - business website and "what describes you" (optional)
--   - every person gets a unique REFERRAL CODE (their link is ?ref=<code>)
--   - people who join through a link count as a referral for that person
--   - queue position is computed from real rows only: referrals first, then join time
--   - a person's status is read with their code (random, unguessable); nothing else is exposed
-- Still true from 0012: nobody can read the list directly, joining never reveals whether an email
-- already existed, and unsubscribed emails stay unsubscribed.

alter table public.waitlist alter column name drop not null;
alter table public.waitlist alter column name set default '';
alter table public.waitlist drop constraint if exists waitlist_name_check;
alter table public.waitlist add constraint waitlist_name_check check (char_length(name) <= 80);

alter table public.waitlist add column website text check (char_length(website) <= 200);
alter table public.waitlist add column role text check (role in ('founder', 'ecommerce', 'marketer', 'agency', 'other'));
alter table public.waitlist add column referral_code text not null
  default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
alter table public.waitlist add column referred_by text;
create unique index waitlist_referral_code_key on public.waitlist (referral_code);

-- Only a valid, existing code can count as a referral (never yourself).
alter table public.waitlist add constraint waitlist_referred_by_fk
  foreign key (referred_by) references public.waitlist (referral_code) on delete set null;

-- Replace the 3-argument version with one that takes the new fields (all optional).
drop function if exists public.join_waitlist(text, text, text);

create function public.join_waitlist(
  p_email text,
  p_name text default '',
  p_source text default 'landing',
  p_website text default null,
  p_role text default null,
  p_ref text default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'));
  v_source text := case when p_source in ('landing', 'landing-next', 'overview', 'share') then p_source else 'landing' end;
  v_site text := nullif(btrim(coalesce(p_website, '')), '');
  v_role text := case when p_role in ('founder', 'ecommerce', 'marketer', 'agency', 'other') then p_role else null end;
  v_ref text := nullif(btrim(coalesce(p_ref, '')), '');
  v_code text;
  v_ref_ok boolean := false;
begin
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address.';
  end if;
  if char_length(v_name) > 80 then
    raise exception 'Please keep your first name under 80 characters.';
  end if;
  if v_site is not null and (char_length(v_site) > 200 or v_site !~* '^(https?://)?[a-z0-9.-]+\.[a-z]{2,}(/.*)?$') then
    raise exception 'Please enter a website like yourbusiness.com.';
  end if;
  if (select count(*) from public.waitlist where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Lots of people are joining right now. Please try again in a few minutes.';
  end if;

  -- Already on the list: update the optional details, then say "thanks" the same way for everyone.
  -- Never give back a referral code here (that would let anyone learn someone else's link).
  if exists (select 1 from public.waitlist w where lower(w.email) = v_email) then
    update public.waitlist w
       set name = case when v_name <> '' then v_name else w.name end,
           website = coalesce(v_site, w.website),
           role = coalesce(v_role, w.role)
     where lower(w.email) = v_email and w.unsubscribed_at is null;
    return jsonb_build_object('status', 'ok', 'already', true);
  end if;

  -- A referral only counts when the referrer is a real, active person (and never yourself).
  if v_ref is not null then
    select exists (select 1 from public.waitlist w where w.referral_code = v_ref and w.unsubscribed_at is null) into v_ref_ok;
  end if;

  insert into public.waitlist (email, name, source, website, role, referred_by)
  values (v_email, v_name, v_source, v_site, v_role, case when v_ref_ok then v_ref else null end)
  on conflict (lower(email)) do nothing
  returning referral_code into v_code;

  if v_code is null then
    return jsonb_build_object('status', 'ok', 'already', true); -- lost a race with a double-click: same answer
  end if;
  return jsonb_build_object('status', 'ok', 'already', false, 'referral_code', v_code);
end $$;

-- A person's place in line, from real rows only. Priority: more referrals first, then earlier join.
create function public.waitlist_status(p_code text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with counted as (
    select w.referral_code,
           w.created_at,
           (select count(*) from public.waitlist r
             where r.referred_by = w.referral_code and r.unsubscribed_at is null)::integer as referrals
      from public.waitlist w
     where w.unsubscribed_at is null
  ),
  ranked as (
    select c.*, row_number() over (order by c.referrals desc, c.created_at asc) as position
      from counted c
  )
  select coalesce(
    (select jsonb_build_object('found', true, 'position', r.position,
                               'total', (select count(*) from ranked), 'referrals', r.referrals)
       from ranked r where r.referral_code = btrim(p_code)),
    jsonb_build_object('found', false))
$$;

revoke all on function public.join_waitlist(text, text, text, text, text, text) from public;
revoke all on function public.waitlist_status(text) from public;
grant execute on function public.join_waitlist(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.waitlist_status(text) to anon, authenticated;
