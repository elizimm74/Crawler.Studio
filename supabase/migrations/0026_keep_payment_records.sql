-- 0026 KEEP PAYMENT RECORDS WHEN AN ACCOUNT IS DELETED (2026-11-27, found while applying 0021).
-- payments and purchases were linked to the login with ON DELETE CASCADE, so "Delete account" would
-- also erase the money records that tax/accounting rules require us to keep (and that the Privacy
-- Policy says we keep). Now deleting an account keeps those rows, with the person removed
-- (user_id becomes empty). Nothing personal stays in them: amounts, dates, plan, Stripe ids.
alter table public.payments alter column user_id drop not null;
alter table public.payments drop constraint if exists payments_user_id_fkey;
alter table public.payments add constraint payments_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

alter table public.purchases alter column user_id drop not null;
alter table public.purchases drop constraint if exists purchases_user_id_fkey;
alter table public.purchases add constraint purchases_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
