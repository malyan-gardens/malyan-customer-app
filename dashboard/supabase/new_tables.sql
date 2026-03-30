-- Promotions
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount_type text,
  discount_value numeric(10,2),
  image_url text,
  start_date date,
  end_date date,
  active boolean default true,
  created_at timestamptz default now()
);

-- Banners
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text,
  link text,
  position text default 'home',
  active boolean default true,
  created_at timestamptz default now()
);

-- Maintenance requests
create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  service_type text,
  scheduled_date text,
  scheduled_time text,
  location text,
  notes text,
  assigned_to text,
  status text default 'pending',
  total_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Design requests
create table if not exists design_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  project_type text,
  location text,
  area_sqm numeric(10,2),
  budget_range numeric(10,2),
  style_preference text,
  notes text,
  internal_notes text,
  proposal_url text,
  status text default 'new',
  assigned_to text,
  total_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text unique,
  email text,
  address text,
  type text,
  notes text,
  total_orders integer default 0,
  total_spent numeric(10,2) default 0,
  last_order_at timestamptz,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  type text,
  read boolean default false,
  reference_id uuid,
  reference_type text,
  created_at timestamptz default now()
);

-- Payment transactions (QNB placeholder)
create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  provider text default 'qnb',
  amount numeric(12,2) not null default 0,
  status text default 'pending',
  reference text,
  created_at timestamptz default now()
);

-- Disable RLS for admin modules (required for this dashboard build)
alter table promotions disable row level security;
alter table banners disable row level security;
alter table maintenance_requests disable row level security;
alter table design_requests disable row level security;
alter table customers disable row level security;
alter table notifications disable row level security;
alter table payment_transactions disable row level security;

