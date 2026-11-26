-- 0024 PAY PER ANALYSIS (2026-11-26, founder: "get rid of the yearly plans; the only pricing should be
-- the monthly plans and then paying per analysis").
-- The one-time Crawler PACKS (500 / 2,000 / 10,000 / 25,000) are replaced by buying ONE analysis of a
-- chosen size: test100 $5, test250 $10, test500 $18, test1000 $29 (src/lib/plans.ts PACKS).
-- It reuses the pack machinery from 0023 unchanged: record_pack() adds that many Crawlers to
-- profiles.pack_crawlers, start_test() uses them after any monthly Crawlers, and a failed test
-- gives them back. So only the price list and the allowed ids change here.
-- The OLD pack ids stay valid so past purchases (sandbox) keep their meaning; nothing sells them now.
-- Annual billing: nothing to change in the database (old annual subscriptions keep working; the
-- website no longer offers annual checkout).

alter table public.purchases drop constraint if exists purchases_plan_id_check;
alter table public.purchases add constraint purchases_plan_id_check
  check (plan_id in ('launch', 'studio', 'pack500', 'pack2000', 'pack10000', 'pack25000',
                     'test100', 'test250', 'test500', 'test1000'));

create or replace function public.pack_crawlers(p_pack text) returns integer
language sql immutable set search_path = '' as $$
  select case p_pack
    when 'test100' then 100 when 'test250' then 250 when 'test500' then 500 when 'test1000' then 1000
    when 'pack500' then 500 when 'pack2000' then 2000 when 'pack10000' then 10000 when 'pack25000' then 25000
    else 0 end
$$;

-- the most Stripe may charge for each (record_pack refuses anything above it)
create or replace function public.pack_price_cents(p_pack text) returns integer
language sql immutable set search_path = '' as $$
  select case p_pack
    when 'test100' then 500 when 'test250' then 1000 when 'test500' then 1800 when 'test1000' then 2900
    when 'pack500' then 900 when 'pack2000' then 2900 when 'pack10000' then 9900 when 'pack25000' then 19900
    else 0 end
$$;
