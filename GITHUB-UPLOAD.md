# رفع مشروع مليان على GitHub

**المستودع:** https://github.com/malyan-gardens/malyan-app.git

---

## 1) تثبيت Git (مرة واحدة)

- حمّل من: **https://git-scm.com/download/win**
- ثبّت ثم أعد فتح الطرفية (PowerShell أو CMD).

---

## 2) تنفيذ الأوامر من فولدر مليان

افتح **PowerShell** أو **Command Prompt** ونفّذ بالترتيب:

```bash
cd "c:\Users\ZAHER\Desktop\مليان"
```

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Malyan: Dashboard + Driver + Customer apps"
```

```bash
git remote add origin https://github.com/malyan-gardens/malyan-app.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

---

## 3) إذا طلب منك تسجيل الدخول

- **Username:** حساب GitHub (مثلاً malyan-gardens أو اسم المستخدم الشخصي).
- **Password:** استخدم **Personal Access Token** وليس كلمة مرور الحساب.
  - من GitHub: Settings → Developer settings → Personal access tokens → Generate new token.
  - اختر صلاحية **repo** ثم انسخ الـ token والصقه مكان كلمة المرور.

---

بعد نجاح `git push` يكون كل الكود على:
**https://github.com/malyan-gardens/malyan-app**
