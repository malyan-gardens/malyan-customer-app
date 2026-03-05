import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const kpis = [
  { label: 'طلبات الشهر', value: '24' },
  { label: 'مشاريع جارية', value: '5' },
  { label: 'إيرادات الشهر (QAR)', value: '18,500', gold: true },
  { label: 'أعضاء الفريق', value: '8' },
];

const recentOrders = [
  { id: '1', customer: 'أحمد محمد', service: 'صيانة حديقة', date: '2025-02-27', status: 'in_progress' },
  { id: '2', customer: 'شركة النخبة', service: 'لاندسكيب', date: '2025-02-26', status: 'confirmed' },
  { id: '3', customer: 'فاطمة علي', service: 'نباتات صناعية', date: '2025-02-25', status: 'completed' },
  { id: '4', customer: 'خالد الدوسري', service: 'زراعة', date: '2025-02-24', status: 'pending' },
];

const chartData = [
  { name: 'يناير', إيرادات: 12000 },
  { name: 'فبراير', إيرادات: 18500 },
  { name: 'مارس', إيرادات: 14200 },
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

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">لوحة التحكم</h1>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-green-deep/10 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.gold ? 'text-gold' : 'text-green-deep'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mb-8 rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-green-deep">الإيرادات (آخر 3 أشهر)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f5ef" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 14 }} />
              <Tooltip />
              <Bar dataKey="إيرادات" fill="#1a5c42" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-green-deep">أحدث الطلبات</h2>
          <Link to="/orders" className="text-sm font-medium text-gold hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-green-soft text-green-deep">
                <th className="pb-3 pr-4 font-bold">العميل</th>
                <th className="pb-3 pr-4 font-bold">الخدمة</th>
                <th className="pb-3 pr-4 font-bold">التاريخ</th>
                <th className="pb-3 pr-4 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-green-soft/50">
                  <td className="py-3 pr-4">
                    <Link to={`/orders/${o.id}`} className="font-medium text-green-deep hover:underline">
                      {o.customer}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{o.service}</td>
                  <td className="py-3 pr-4 text-gray-600">{o.date}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[o.status]}`}>
                      {statusLabel[o.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
