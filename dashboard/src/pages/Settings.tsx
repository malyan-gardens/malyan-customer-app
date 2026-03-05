export default function SettingsPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">الإعدادات</h1>
      <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-bold text-green-deep mb-2">الحساب</h2>
          <p className="text-gray-600">تعديل البريد وكلمة المرور من Supabase Auth لاحقاً.</p>
        </div>
        <div>
          <h2 className="font-bold text-green-deep mb-2">الشركة</h2>
          <p className="text-gray-600">مليان للتجارة والحدائق — قطر. zaher@malyangardens.com</p>
        </div>
      </div>
    </>
  );
}
