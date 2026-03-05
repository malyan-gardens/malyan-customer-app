import { Link } from 'react-router-dom';

const orders = [
  { id: '1', customer: 'أحمد محمد', service: 'صيانة حديقة', date: '2025-02-27', status: 'in_progress' },
  { id: '2', customer: 'شركة النخبة', service: 'لاندسكيب', date: '2025-02-26', status: 'confirmed' },
  { id: '3', customer: 'فاطمة علي', service: 'نباتات صناعية', date: '2025-02-25', status: 'completed' },
  { id: '4', customer: 'خالد الدوسري', service: 'زراعة', date: '2025-02-24', status: 'pending' },
];

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-soft text-green-mid',
  completed: 'bg-emerald-100 text-emerald-800',
};
const statusLabel: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};

export default function OrdersPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">الطلبات</h1>
      <div className="overflow-hidden rounded-2xl border border-green-deep/10 bg-white shadow-sm">
        <table className="w-full text-right">
          <thead className="bg-green-soft/50">
            <tr className="text-green-deep">
              <th className="p-4 font-bold">العميل</th>
              <th className="p-4 font-bold">الخدمة</th>
              <th className="p-4 font-bold">التاريخ</th>
              <th className="p-4 font-bold">الحالة</th>
              <th className="p-4 font-bold">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-green-soft/50 hover:bg-green-soft/20">
                <td className="p-4 font-medium">{o.customer}</td>
                <td className="p-4 text-gray-600">{o.service}</td>
                <td className="p-4 text-gray-600">{o.date}</td>
                <td className="p-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[o.status]}`}>
                    {statusLabel[o.status]}
                  </span>
                </td>
                <td className="p-4">
                  <Link to={`/orders/${o.id}`} className="font-medium text-gold hover:underline">تفاصيل</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
