create table if not exists otp_rate_limit (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  attempts int not null default 0,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_otp_rate_limit_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_otp_rate_limit_updated_at on otp_rate_limit;
create trigger trg_otp_rate_limit_updated_at
before update on otp_rate_limit
for each row
execute function set_otp_rate_limit_updated_at();

alter table otp_rate_limit enable row level security;

drop policy if exists "otp row owner select" on otp_rate_limit;
create policy "otp row owner select"
on otp_rate_limit
for select
to authenticated
using (phone_number = coalesce(auth.jwt() ->> 'phone', ''));

drop policy if exists "otp row owner insert" on otp_rate_limit;
create policy "otp row owner insert"
on otp_rate_limit
for insert
to authenticated
with check (phone_number = coalesce(auth.jwt() ->> 'phone', ''));

drop policy if exists "otp row owner update" on otp_rate_limit;
create policy "otp row owner update"
on otp_rate_limit
for update
to authenticated
using (phone_number = coalesce(auth.jwt() ->> 'phone', ''))
with check (phone_number = coalesce(auth.jwt() ->> 'phone', ''));
