# 🌿 MALYAN GARDENS — CURSOR MASTER PROMPT
## مليان للتجارة والحدائق — قطر

---

## 🎯 نظرة عامة على المشروع

أنت تبني **نظام إدارة متكامل** لشركة **مليان للتجارة والحدائق** في قطر.
الشركة تقدم: نباتات صناعية + لاندسكيب + زراعة + صيانة.
الهدف: أول شركة في قطر تعمل 100% بالذكاء الاصطناعي.

**صاحب المشروع:** زاهر توزري — zaher@malyangardens.com
**GitHub:** malyan-gardens

---

## 📦 المنتجات الثلاثة (تُبنى بالتوازي)

### 1️⃣ Dashboard الشركة — `malyan-dashboard`
موقع ويب داخلي (React + Supabase + Vercel)

### 2️⃣ تطبيق السائق — `malyan-driver`
React Native Expo — بسيط وسريع

### 3️⃣ تطبيق العميل — `malyan-customer`
React Native Expo — كامل الميزات

---

## 🗂️ هيكل المجلدات

```
malyan-gardens/
├── malyan-dashboard/          # React Web App
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── utils.ts
│   │   └── types/
│   ├── public/
│   ├── .env.local
│   └── package.json
│
├── malyan-driver/             # React Native (Expo)
│   ├── app/
│   │   ├── (tabs)/
│   │   └── _layout.tsx
│   ├── components/
│   ├── lib/
│   │   └── supabase.ts
│   └── package.json
│
├── malyan-customer/           # React Native (Expo)
│   ├── app/
│   │   ├── (tabs)/
│   │   ├── auth/
│   │   └── _layout.tsx
│   ├── components/
│   ├── lib/
│   │   └── supabase.ts
│   └── package.json
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── seed.sql
```

---

## 🛠️ التقنيات المطلوبة

```
Dashboard:
- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS (RTL plugin)
- Supabase JS Client
- React Router v6
- React Query (TanStack)
- Recharts (للرسوم البيانية)
- React Hook Form + Zod
- Vercel (deployment)

التطبيقات:
- React Native + Expo SDK 51
- Expo Router (file-based routing)
- Supabase JS Client
- React Native Maps
- Expo Notifications
- Expo Camera (للصور)
- Expo Location

قاعدة البيانات:
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Realtime subscriptions
- Supabase Storage (للصور)

AI:
- Claude API (claude-sonnet-4-20250514)
- للشات في تطبيق العميل

الدفع:
- Stripe (كبديل QNB في البداية)
- QNB API لاحقاً
```

---

## 🗄️ قاعدة البيانات — Supabase Schema

```sql
-- ملف: supabase/migrations/001_initial_schema.sql

-- USERS & AUTH
create table profiles (
  id uuid references auth.users primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('admin', 'accountant', 'employee', 'driver', 'customer')) default 'customer',
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- PROJECTS
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null,
  client_phone text,
  location text not null,
  type text check (type in ('landscape', 'planting', 'maintenance', 'artificial')),
  status text check (status in ('planning', 'in_progress', 'completed', 'cancelled')) default 'planning',
  progress integer default 0 check (progress between 0 and 100),
  budget numeric(12,2),
  start_date date,
  end_date date,
  notes text,
  assigned_employee uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROJECT IMAGES
create table project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  image_url text not null,
  type text check (type in ('before', 'after', 'progress')),
  uploaded_at timestamptz default now()
);

-- PROJECT COMPLAINTS
create table complaints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  order_id uuid references orders(id),
  customer_id uuid references profiles(id),
  description text not null,
  status text check (status in ('open', 'in_review', 'resolved')) default 'open',
  created_at timestamptz default now()
);

-- INVENTORY
create table inventory (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  description text,
  price numeric(10,2) not null,
  cost_price numeric(10,2),
  stock_quantity integer default 0,
  unit text default 'piece',
  category text check (category in ('natural', 'artificial', 'grass', 'tools', 'accessories')),
  image_url text,
  is_available boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ORDERS (طلبات الخدمات)
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references profiles(id),
  service_type text check (service_type in ('maintenance', 'planting', 'landscape', 'delivery', 'consultation')),
  status text check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) default 'pending',
  scheduled_date date,
  scheduled_time time,
  location text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  notes text,
  assigned_driver uuid references profiles(id),
  assigned_employee uuid references profiles(id),
  total_amount numeric(12,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ORDER ITEMS (للتجارة)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  inventory_id uuid references inventory(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);

-- DELIVERIES (تتبع التوصيل)
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  driver_id uuid references profiles(id),
  status text check (status in ('assigned', 'picked_up', 'on_way', 'delivered', 'failed')) default 'assigned',
  pickup_time timestamptz,
  delivery_time timestamptz,
  delivery_photo_url text,
  driver_notes text,
  customer_signature_url text,
  created_at timestamptz default now()
);

-- INVOICES
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  project_id uuid references projects(id),
  order_id uuid references orders(id),
  customer_id uuid references profiles(id),
  amount numeric(12,2) not null,
  tax_amount numeric(12,2) default 0,
  total_amount numeric(12,2) not null,
  status text check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')) default 'draft',
  due_date date,
  paid_at timestamptz,
  payment_method text,
  qnb_reference text,
  notes text,
  created_at timestamptz default now()
);

-- PAYMENTS
create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id),
  amount numeric(12,2) not null,
  payment_method text check (payment_method in ('qnb', 'cash', 'stripe', 'bank_transfer')),
  reference text,
  status text check (status in ('pending', 'completed', 'failed', 'refunded')) default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text not null,
  body text,
  type text check (type in ('order', 'delivery', 'payment', 'complaint', 'general')),
  is_read boolean default false,
  data jsonb,
  created_at timestamptz default now()
);

-- CHAT MESSAGES (AI Chat)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- RLS Policies
alter table profiles enable row level security;
alter table projects enable row level security;
alter table orders enable row level security;
alter table deliveries enable row level security;
alter table invoices enable row level security;
alter table notifications enable row level security;
alter table chat_messages enable row level security;

-- Profiles: users see their own profile, admins see all
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'accountant', 'employee'))
);

-- Orders: customers see their orders, staff see all
create policy "Customer sees own orders" on orders for select using (customer_id = auth.uid());
create policy "Staff sees all orders" on orders for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'accountant', 'employee', 'driver'))
);

-- Deliveries: drivers see their deliveries
create policy "Driver sees own deliveries" on deliveries for select using (driver_id = auth.uid());
create policy "Staff sees all deliveries" on deliveries for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'employee'))
);
```

---

## 1️⃣ DASHBOARD — الميزات الكاملة

### الصفحات المطلوبة:

```
/login              — تسجيل دخول بـ @malyangardens.com فقط
/dashboard          — الرئيسية مع KPIs
/projects           — قائمة المشاريع
/projects/new       — مشروع جديد
/projects/:id       — تفاصيل مشروع (صور قبل/بعد، مراحل، شكاوي)
/orders             — الطلبات والخدمات
/orders/:id         — تفاصيل طلب
/inventory          — المخزن (شبكة بطاقات + تعديل سعر/كمية)
/finance            — الفواتير والتقارير
/finance/invoices   — قائمة الفواتير
/finance/reports    — تقارير شهرية/سنوية
/payments           — مدفوعات QNB + سجل المعاملات
/team               — إدارة الفريق
/settings           — الإعدادات
```

### متطلبات تقنية مهمة:
- **Auth:** Supabase Auth — restrict login to @malyangardens.com domain
- **RTL:** كل الواجهة عربية RTL كاملاً
- **Theme:** أخضر `#1a7a3c` + أسود `#080e0a`
- **Realtime:** استخدم Supabase Realtime لتحديث الطلبات فورياً
- **Images:** Supabase Storage لرفع صور المشاريع
- **Reports:** Recharts لرسوم بيانية الإيرادات
- **PDF:** react-pdf لتوليد الفواتير

### كود Supabase Client:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Auth Guard:
```typescript
// src/lib/auth.ts
export async function requireMalyanEmail(email: string) {
  if (!email.endsWith('@malyangardens.com')) {
    throw new Error('يجب أن يكون الإيميل من نطاق @malyangardens.com')
  }
}
```

---

## 2️⃣ تطبيق السائق — الميزات

### الشاشات:
```
app/
├── (auth)/
│   └── login.tsx          — تسجيل دخول بسيط
├── (tabs)/
│   ├── index.tsx           — قائمة توصيلات اليوم
│   ├── history.tsx         — سجل التوصيلات
│   └── profile.tsx         — الملف الشخصي
└── delivery/[id].tsx       — تفاصيل توصيلة محددة
```

### شاشة التوصيل `delivery/[id].tsx`:
```
- اسم العميل + رقم الهاتف (اتصال مباشر)
- العنوان الكامل
- زر "افتح في الخريطة" → Google Maps
- صورة حالية للموقع
- ✅ زر "تم التوصيل" → يفتح الكاميرا لالتقاط صورة إثبات
- حالة: مُسند → في الطريق → تم التوصيل
- إشعارات Push فورية عند تعيين توصيلة جديدة
```

### كود مهم:
```typescript
// تحديث حالة التوصيل
async function markDelivered(deliveryId: string, photoUri: string) {
  // رفع الصورة
  const { data } = await supabase.storage
    .from('delivery-photos')
    .upload(`${deliveryId}/proof.jpg`, photoBlob)
  
  // تحديث الحالة
  await supabase
    .from('deliveries')
    .update({ 
      status: 'delivered',
      delivery_photo_url: data?.path,
      delivery_time: new Date().toISOString()
    })
    .eq('id', deliveryId)
}
```

---

## 3️⃣ تطبيق العميل — الميزات الكاملة

### الشاشات:
```
app/
├── (auth)/
│   ├── welcome.tsx         — شاشة ترحيب
│   ├── login.tsx           — بإيميل أو واتساب OTP
│   └── register.tsx
├── (tabs)/
│   ├── index.tsx           — الرئيسية
│   ├── catalog.tsx         — كتالوج النباتات
│   ├── orders.tsx          — طلباتي
│   └── profile.tsx
├── catalog/[id].tsx        — تفاصيل نبات
├── cart/index.tsx          — سلة التسوق
├── checkout/index.tsx      — الدفع (Stripe)
├── services/index.tsx      — طلب خدمة (صيانة/زراعة/لاندسكيب)
├── track/[orderId].tsx     — تتبع الطلب
└── chat/index.tsx          — شات مع AI
```

### شاشة الشات مع Claude AI:
```typescript
// app/chat/index.tsx
async function sendMessage(userMessage: string) {
  // أضف رسالة المستخدم
  setMessages(prev => [...prev, { role: 'user', content: userMessage }])
  
  // احفظ في Supabase
  await supabase.from('chat_messages').insert({
    customer_id: user.id,
    role: 'user',
    content: userMessage
  })
  
  // اتصل بـ Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `أنت مساعد شركة مليان للتجارة والحدائق في قطر.
      تساعد العملاء في:
      - معرفة أسعار النباتات والخدمات
      - متابعة حالة طلباتهم
      - الاستفسار عن خدمات اللاندسكيب والزراعة والصيانة
      - نصائح العناية بالنباتات
      تجاوب بالعربية دائماً، بأسلوب ودي ومحترف.`,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ]
    })
  })
  
  const data = await response.json()
  const aiResponse = data.content[0].text
  
  // أضف رد Claude
  setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
  
  // احفظ في Supabase
  await supabase.from('chat_messages').insert({
    customer_id: user.id,
    role: 'assistant',
    content: aiResponse
  })
}
```

### تتبع الطلب Realtime:
```typescript
// app/track/[orderId].tsx
useEffect(() => {
  const subscription = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'deliveries',
      filter: `order_id=eq.${orderId}`
    }, (payload) => {
      setDeliveryStatus(payload.new.status)
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [orderId])
```

---

## 🌐 متغيرات البيئة

### Dashboard (.env.local):
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### التطبيقات (.env):
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
CLAUDE_API_KEY=your_claude_api_key
```

---

## 🎨 التصميم — القواعد الإلزامية

```
✅ الألوان:
   - Primary Green: #1a7a3c
   - Light Green: #22a84f
   - Accent: #4cdf80
   - Background: #080e0a
   - Surface: #0f1a12
   - Text: #e8f0ea

✅ الخطوط:
   - Arabic: Cairo (Google Fonts) — للعناوين
   - Arabic Body: IBM Plex Sans Arabic — للنصوص

✅ القواعد:
   - كل الواجهات RTL (direction: rtl)
   - كل النصوص بالعربية
   - الأرقام بالعربي أو اللاتيني (QAR دائماً كعملة)
   - dark mode فقط — لا light mode
   - Responsive: موبايل أول
```

---

## 🔔 الإشعارات Push

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications'

// للسائق: إشعار عند تعيين توصيلة
// للعميل: إشعار عند تغيير حالة الطلب

async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: object
) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: expoPushToken, title, body, data })
  })
}
```

---

## 🚀 أوامر البدء

```bash
# Dashboard
cd malyan-dashboard
npm create vite@latest . -- --template react-ts
npm install @supabase/supabase-js @tanstack/react-query react-router-dom tailwindcss recharts react-hook-form zod
npm run dev

# تطبيق السائق
cd malyan-driver
npx create-expo-app@latest . --template blank-typescript
npx expo install @supabase/supabase-js expo-notifications expo-camera expo-location react-native-maps
npx expo start

# تطبيق العميل
cd malyan-customer
npx create-expo-app@latest . --template blank-typescript
npx expo install @supabase/supabase-js expo-notifications expo-camera expo-location react-native-maps @stripe/stripe-react-native
npx expo start

# Supabase
npx supabase init
npx supabase db push
```

---

## ✅ ترتيب الإنشاء في Cursor

1. **أولاً:** انشئ `supabase/migrations/001_initial_schema.sql` وشغّله
2. **ثانياً:** ابنِ Dashboard الشركة — Auth + Layout + Supabase connection
3. **بالتوازي:** ابنِ الشاشة الرئيسية للسائق (قائمة التوصيلات)
4. **بالتوازي:** ابنِ شاشة الترحيب + Login للعميل
5. **بعدها:** أكمل باقي الشاشات قسم قسم

---

## 💡 ملاحظات مهمة لـ Cursor

- استخدم **Cursor Composer** (Cmd+I) للملفات المتعددة
- اكتب `@supabase/migrations/001_initial_schema.sql` لإضافة السكيما كـ context
- استخدم `@malyan-dashboard` و `@malyan-driver` و `@malyan-customer` كـ context منفصل لكل مشروع
- عند بناء مكون جديد، أضف `@types/index.ts` كـ context لضمان type safety
- شغّل Supabase Types: `npx supabase gen types typescript --local > src/types/supabase.ts`

---

*مليان للتجارة والحدائق — قطر 🇶🇦*
*zaher@malyangardens.com*
