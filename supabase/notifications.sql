create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  type text,
  created_at timestamptz default now()
);
alter table notifications disable row level security;
