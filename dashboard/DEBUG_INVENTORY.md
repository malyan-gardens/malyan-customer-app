# تشخيص حفظ المخزون (Inventory)

## أعمدة الجدول المتوقعة (من `supabase/002_inventory.sql`)

- `name_ar` (نص)
- `cost_price` — سعر الشراء (ليس `purchase_price` إلا إذا أضفت عموداً يدوياً)
- `sell_price` — سعر البيع (ليس `selling_price`)
- `quantity`
- `category` — يجب أن تكون واحدة من: `natural` | `artificial` | `soil_supplies` | `other` (ليس النص العربي «أخرى»)

## اختبار من Console في المتصفح (بعد فتح لوحة التحكم)

تأكد أنك مسجّل الدخول، ثم:

```js
const { data: { session } } = await supabase.auth.getSession();
console.log('session', session);

const { data, error } = await supabase.from('inventory').insert({
  name_ar: 'test',
  quantity: 1,
  sell_price: 10,
  cost_price: 5,
  category: 'other',
});
console.log('insert result', data, error);
```

> `supabase` متاح فقط إذا عرّفته في الـwindow أو استوردته من وحدة — في Vite عادة تستخدم نفس الاستيراد من `src/lib/supabase` داخل التطبيق؛ للاختبار السريع انسخ الاستيراد من ملف مؤقت أو استخدم تبويب Sources.

## سياسات RLS

يجب أن يكون المستخدم `authenticated` حتى ينجح `INSERT` (انظر سياسات `inventory` في SQL).
