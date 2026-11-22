-- 0015: profiles.plan must allow every plan name the Stripe webhook can set.
-- (Before this, 'studio' from 0013 would have been rejected; found while testing 0014.)
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'launch', 'studio', 'pro', 'starter', 'growth', 'scale'));
