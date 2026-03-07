-- =====================
-- INVENTORY (المخزون)
-- =====================
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  image_url text,
  cost_price numeric(10,2) default 0,
  sell_price numeric(10,2) not null,
  quantity integer default 0 check (quantity >= 0),
  category text check (category in ('natural', 'artificial', 'soil_supplies', 'other')) not null default 'other',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- تحديث updated_at تلقائياً
create or replace function update_inventory_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists inventory_updated_at on inventory;
create trigger inventory_updated_at
  before update on inventory
  for each row execute procedure update_inventory_updated_at();

-- RLS
alter table inventory enable row level security;

create policy "Authenticated users can manage inventory"
  on inventory for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ملاحظة: أنشئ bucket باسم inventory-images في Supabase → Storage → New bucket (Public: نعم)
-- ثم من Policies أضف: Allow authenticated upload, public read
