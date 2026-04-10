-- Cash-order invoice WhatsApp dispatch on delivered status (server-side).
-- This runs in Postgres (Supabase) via trigger for reliability.

create extension if not exists pg_net;

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.order_whatsapp_invoice_jobs (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_phone text not null,
  payload jsonb not null,
  status text not null default 'queued', -- queued | sent | failed
  attempt_count integer not null default 0,
  last_error text,
  provider_request_id bigint,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists uq_order_whatsapp_invoice_jobs_order_id
  on public.order_whatsapp_invoice_jobs(order_id);

create or replace function public.send_cash_order_invoice_on_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items_text text;
  v_message text;
  v_payload jsonb;
  v_url text;
  v_api_key text;
  v_request_id bigint;
  v_http_request_id bigint;
begin
  -- Trigger only on transition TO delivered.
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(old.status, '') = 'delivered' or new.status <> 'delivered' then
    return new;
  end if;

  -- Only cash orders. Online orders are already invoiced after payment.
  if lower(coalesce(new.payment_method, '')) <> 'cash' then
    return new;
  end if;

  if coalesce(btrim(new.customer_phone), '') = '' then
    return new;
  end if;

  select coalesce(
           string_agg(
             format(
               '• %s ×%s = %s %s',
               coalesce(i->>'name', 'منتج'),
               coalesce(i->>'quantity', '1'),
               coalesce(i->>'lineTotal', i->>'unitPrice', '0'),
               coalesce(i->>'currency', 'QAR')
             ),
             E'\n'
           ),
           '• لا توجد عناصر'
         )
    into v_items_text
    from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) as i;

  v_message := concat_ws(
    E'\n',
    'فاتورة طلب - مليان للحدائق',
    format('رقم الطلب: %s', new.id),
    format('العميل: %s', coalesce(new.customer_name, '—')),
    format('الهاتف: %s', new.customer_phone),
    format('العنوان: %s', coalesce(new.address, '—')),
    '',
    'العناصر:',
    v_items_text,
    '',
    format('الإجمالي: %s QAR', coalesce(new.total_amount::text, '0')),
    'طريقة الدفع: الدفع كاش',
    'الحالة: delivered',
    '',
    'شكراً لاختياركم مليان للحدائق'
  );

  v_payload := jsonb_build_object(
    'order_id', new.id,
    'to', new.customer_phone,
    'message', v_message
  );

  insert into public.order_whatsapp_invoice_jobs (order_id, customer_phone, payload)
  values (new.id, new.customer_phone, v_payload)
  on conflict (order_id) do update
    set customer_phone = excluded.customer_phone,
        payload = excluded.payload,
        status = 'queued',
        last_error = null
  returning id into v_request_id;

  select value into v_url
    from public.app_config
   where key = 'whatsapp_webhook_url';

  select value into v_api_key
    from public.app_config
   where key = 'whatsapp_webhook_api_key';

  if coalesce(v_url, '') = '' then
    update public.order_whatsapp_invoice_jobs
       set status = 'failed',
           attempt_count = attempt_count + 1,
           last_error = 'Missing app_config.whatsapp_webhook_url'
     where id = v_request_id;
    return new;
  end if;

  begin
    select net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', case when coalesce(v_api_key, '') = '' then null else 'Bearer ' || v_api_key end
      ),
      body := v_payload
    ) into v_http_request_id;

    update public.order_whatsapp_invoice_jobs
       set status = 'sent',
           attempt_count = attempt_count + 1,
           sent_at = now(),
           provider_request_id = v_http_request_id
     where id = v_request_id;
  exception
    when others then
      update public.order_whatsapp_invoice_jobs
         set status = 'failed',
             attempt_count = attempt_count + 1,
             last_error = sqlerrm
       where id = v_request_id;
  end;

  return new;
end;
$$;

drop trigger if exists trg_send_cash_order_invoice_on_delivered on public.orders;
create trigger trg_send_cash_order_invoice_on_delivered
after update of status on public.orders
for each row
execute function public.send_cash_order_invoice_on_delivered();

-- Optional seed keys (set real values in SQL editor):
-- insert into public.app_config(key, value) values
--   ('whatsapp_webhook_url', 'https://your-whatsapp-gateway.example.com/send'),
--   ('whatsapp_webhook_api_key', 'YOUR_SECRET_TOKEN')
-- on conflict (key) do update set value = excluded.value, updated_at = now();
