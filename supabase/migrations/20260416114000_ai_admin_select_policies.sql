-- Allow dashboard users (malyangardens.com) to view AI monitoring data across users.
-- Note: Edge Functions still use service role and bypass RLS.

do $$
begin
  -- Conversations
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'ai_conversations' and policyname = 'ai_conversations_select_dashboard_admin'
  ) then
    create policy ai_conversations_select_dashboard_admin
      on public.ai_conversations for select
      to authenticated
      using (
        (auth.jwt() ->> 'email') ilike '%@malyangardens.com'
      );
  end if;

  -- Daily usage
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'ai_daily_usage' and policyname = 'ai_daily_usage_select_dashboard_admin'
  ) then
    create policy ai_daily_usage_select_dashboard_admin
      on public.ai_daily_usage for select
      to authenticated
      using (
        (auth.jwt() ->> 'email') ilike '%@malyangardens.com'
      );
  end if;

  -- Product requests
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'ai_product_requests' and policyname = 'ai_product_requests_select_dashboard_admin'
  ) then
    create policy ai_product_requests_select_dashboard_admin
      on public.ai_product_requests for select
      to authenticated
      using (
        (auth.jwt() ->> 'email') ilike '%@malyangardens.com'
      );
  end if;

  -- Saved designs
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'ai_saved_designs' and policyname = 'ai_saved_designs_select_dashboard_admin'
  ) then
    create policy ai_saved_designs_select_dashboard_admin
      on public.ai_saved_designs for select
      to authenticated
      using (
        (auth.jwt() ->> 'email') ilike '%@malyangardens.com'
      );
  end if;
end $$;

