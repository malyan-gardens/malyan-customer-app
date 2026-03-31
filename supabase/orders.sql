create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  items jsonb,
  total_amount numeric(10,2),
  payment_method text default 'cash',
  delivery_date text,
  delivery_time text,
  notes text,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table orders disable row level security;
