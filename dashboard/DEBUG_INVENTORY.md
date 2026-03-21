# تشخيص حفظ المخزون (Inventory)

## أعمدة الجدول الحالية (كما في قاعدة البيانات الفعلية)

- `name_ar`
- `purchase_price` — سعر الشراء
- `selling_price` — سعر البيع
- `quantity`
- `category` — يجب أن تكون واحدة من: `natural` | `artificial` | `soil_supplies` | `other`

(قد توجد أعمدة قديمة مثل `cost_price` / `sell_price` في جداول قديمة؛ التطبيق يعرض `selling_price` مع fallback لـ `sell_price`.)

## اختبار من Console في المتصفح

```js
const { data, error } = await supabase.from('inventory').insert({
  name_ar: 'test',
  quantity: 1,
  selling_price: 10,
  purchase_price: 5,
  category: 'other',
});
console.log(data, error);
```

## سياسات RLS

يجب أن يكون المستخدم `authenticated` حتى ينجح `INSERT` (انظر سياسات `inventory` في SQL).
