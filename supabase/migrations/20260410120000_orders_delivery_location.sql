-- Delivery coordinates and geocoded address for customer orders.
-- Apply in Supabase: SQL Editor → New query → paste → Run.

alter table public.orders
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text;

comment on column public.orders.latitude is 'GPS latitude from customer app';
comment on column public.orders.longitude is 'GPS longitude from customer app';
comment on column public.orders.address is 'Reverse-geocoded delivery address';

-- Ensure anon/authenticated clients can update order status after online payment (adjust to your RLS model).
-- Example policy (uncomment and tailor):
-- create policy "orders_update_own_or_service"
--   on public.orders for update
--   using (true)
--   with check (true);
