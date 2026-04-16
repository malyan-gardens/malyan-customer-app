-- Malyan AI Assistant schema (customer app + dashboard analytics)

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_type text not null default 'chat',
  title text,
  messages jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_model text,
  estimated_cost_usd numeric(10, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  message_count integer not null default 0 check (message_count >= 0),
  cost_usd numeric(10, 4) not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.ai_product_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_saved_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  preferences jsonb not null default '{}'::jsonb,
  proposal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user_date
  on public.ai_conversations (user_id, updated_at desc);
create index if not exists idx_ai_daily_usage_date
  on public.ai_daily_usage (date desc);
create index if not exists idx_ai_product_requests_user_date
  on public.ai_product_requests (user_id, created_at desc);
create index if not exists idx_ai_saved_designs_user_date
  on public.ai_saved_designs (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.touch_updated_at();

drop trigger if exists trg_ai_daily_usage_updated_at on public.ai_daily_usage;
create trigger trg_ai_daily_usage_updated_at
before update on public.ai_daily_usage
for each row execute function public.touch_updated_at();

drop trigger if exists trg_ai_saved_designs_updated_at on public.ai_saved_designs;
create trigger trg_ai_saved_designs_updated_at
before update on public.ai_saved_designs
for each row execute function public.touch_updated_at();

alter table public.ai_conversations enable row level security;
alter table public.ai_daily_usage enable row level security;
alter table public.ai_product_requests enable row level security;
alter table public.ai_saved_designs enable row level security;

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
create policy "ai_conversations_select_own"
  on public.ai_conversations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
create policy "ai_conversations_insert_own"
  on public.ai_conversations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
create policy "ai_conversations_update_own"
  on public.ai_conversations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_daily_usage_select_own" on public.ai_daily_usage;
create policy "ai_daily_usage_select_own"
  on public.ai_daily_usage for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_daily_usage_insert_own" on public.ai_daily_usage;
create policy "ai_daily_usage_insert_own"
  on public.ai_daily_usage for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_daily_usage_update_own" on public.ai_daily_usage;
create policy "ai_daily_usage_update_own"
  on public.ai_daily_usage for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_product_requests_select_own" on public.ai_product_requests;
create policy "ai_product_requests_select_own"
  on public.ai_product_requests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_product_requests_insert_own" on public.ai_product_requests;
create policy "ai_product_requests_insert_own"
  on public.ai_product_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_saved_designs_select_own" on public.ai_saved_designs;
create policy "ai_saved_designs_select_own"
  on public.ai_saved_designs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_saved_designs_insert_own" on public.ai_saved_designs;
create policy "ai_saved_designs_insert_own"
  on public.ai_saved_designs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_saved_designs_update_own" on public.ai_saved_designs;
create policy "ai_saved_designs_update_own"
  on public.ai_saved_designs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
