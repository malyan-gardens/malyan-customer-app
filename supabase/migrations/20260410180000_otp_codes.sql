-- Custom WhatsApp OTP codes (written by Edge Functions with service role).
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists idx_otp_codes_phone_active
  on public.otp_codes (phone)
  where consumed_at is null;

create index if not exists idx_otp_codes_expires_at on public.otp_codes (expires_at);

alter table public.otp_codes enable row level security;

-- No policies: anon/authenticated cannot read/write. Service role bypasses RLS.

comment on table public.otp_codes is 'Short-lived OTP for custom Twilio WhatsApp auth';
