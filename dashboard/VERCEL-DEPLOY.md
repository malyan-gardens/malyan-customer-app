# نشر الداشبورد على Vercel

## الطريقة: ربط مستودع GitHub

1. ادخل إلى **https://vercel.com** وسجّل الدخول.
2. اضغط **Add New…** → **Project**.
3. اختر المستودع **malyan-gardens/malyan-app** (أو استورد من GitHub لو أول مرة).
4. **مهم:** في إعدادات المشروع:
   - **Root Directory:** اضغط **Edit** واختر **dashboard** (فولدر الداشبورد فقط).
   - **Framework Preset:** Vite (يُختار تلقائياً غالباً).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. اضغط **Deploy**.

بعد الانتهاء يعطيك Vercel رابط مثل:  
`https://malyan-app-xxx.vercel.app`  
أو يمكنك ربط دومين خاص من إعدادات المشروع.

---

## متغيرات البيئة (اختياري)

إذا استخدمت Supabase لاحقاً، من المشروع في Vercel: **Settings → Environment Variables** وأضف:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

ثم أعد النشر (Redeploy).
