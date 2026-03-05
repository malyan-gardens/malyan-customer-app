-- =====================
-- PROFILES (المستخدمون)
-- =====================
create table if not exists profiles (
  id uuid references auth.users primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('admin', 'accountant', 'employee')) default 'employee',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =====================
-- FINANCE (المالية)
-- =====================

create table if not exists finance_categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  type text check (type in ('income', 'expense')) not null,
  icon text,
  color text,
  created_at timestamptz default now()
);

create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('income', 'expense')) not null,
  category_id uuid references finance_categories(id),
  amount numeric(12,2) not null,
  description text not null,
  date date not null default current_date,
  month integer generated always as (extract(month from date)::integer) stored,
  year integer generated always as (extract(year from date)::integer) stored,
  payment_method text check (payment_method in ('cash', 'qnb_transfer', 'qnb_card', 'check')) default 'cash',
  reference text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table finance_categories enable row level security;
alter table finance_transactions enable row level security;

create policy "Staff access profiles" on profiles
  for all using (auth.uid() = id or exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Auth users see categories" on finance_categories
  for select using (auth.role() = 'authenticated');

create policy "Auth users manage transactions" on finance_transactions
  for all using (auth.role() = 'authenticated');

-- =====================
-- SEED: فئات افتراضية
-- =====================
insert into finance_categories (name_ar, type, icon, color) values
  ('مبيعات نباتات', 'income', '🪴', '#22a84f'),
  ('مشاريع لاندسكيب', 'income', '🏗️', '#22a84f'),
  ('خدمات صيانة', 'income', '🔧', '#22a84f'),
  ('توصيل', 'income', '🚚', '#22a84f'),
  ('رواتب', 'expense', '👷', '#e05252'),
  ('إيجار مخزن', 'expense', '🏭', '#e05252'),
  ('شراء نباتات', 'expense', '🌱', '#e05252'),
  ('وقود', 'expense', '⛽', '#e05252'),
  ('صيانة سيارات', 'expense', '🔩', '#e05252'),
  ('مستلزمات', 'expense', '📦', '#e05252'),
  ('أخرى', 'income', '💰', '#4a9fd4'),
  ('أخرى', 'expense', '💸', '#c9a84c');
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor
