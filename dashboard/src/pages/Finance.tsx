const invoices = [
  { id: 'INV-001', client: 'أحمد محمد', amount: 1200, status: 'مدفوع', date: '2025-02-20' },
  { id: 'INV-002', client: 'شركة النخبة', amount: 8500, status: 'مرسل', date: '2025-02-22' },
  { id: 'INV-003', client: 'فاطمة علي', amount: 680, status: 'مدفوع', date: '2025-02-25' },
];

export default function FinancePage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">المالية</h1>
      <div className="mb-6 rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-green-deep">ملخص</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">إيرادات الشهر</p>
            <p className="text-xl font-bold text-gold">18,500 QAR</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">فواتير معلقة</p>
            <p className="text-xl font-bold text-green-deep">8,500 QAR</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">فواتير مدفوعة</p>
            <p className="text-xl font-bold text-green-mid">10,000 QAR</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-green-deep/10 bg-white shadow-sm overflow-hidden">
        <h2 className="border-b border-green-soft/50 p-4 text-lg font-bold text-green-deep">الفواتير</h2>
        <table className="w-full text-right">
          <thead className="bg-green-soft/30">
            <tr className="text-green-deep">
              <th className="p-4 font-bold">الرقم</th>
              <th className="p-4 font-bold">العميل</th>
              <th className="p-4 font-bold">المبلغ</th>
              <th className="p-4 font-bold">الحالة</th>
              <th className="p-4 font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-green-soft/50">
                <td className="p-4 font-medium">{inv.id}</td>
                <td className="p-4">{inv.client}</td>
                <td className="p-4 font-medium">{inv.amount} QAR</td>
                <td className="p-4">{inv.status}</td>
                <td className="p-4 text-gray-600">{inv.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
