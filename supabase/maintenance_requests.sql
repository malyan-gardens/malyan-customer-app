create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  service_type text,
  location text,
  scheduled_date text,
  scheduled_time text,
  notes text,
  payment_method text,
  status text default 'pending',
  total_amount numeric(10,2),
  created_at timestamptz default now()
);
alter table maintenance_requests disable row level security;
