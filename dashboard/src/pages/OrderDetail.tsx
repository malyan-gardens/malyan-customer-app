import { useParams, Link } from 'react-router-dom';

const orders: Record<string, { customer: string; service: string; date: string; status: string; location: string; notes: string }> = {
  '1': { customer: 'أحمد محمد', service: 'صيانة حديقة', date: '2025-02-27', status: 'قيد التنفيذ', location: 'الدوحة — برج المطار', notes: 'متابعة أسبوعية' },
  '2': { customer: 'شركة النخبة', service: 'لاندسكيب', date: '2025-02-26', status: 'مؤكد', location: 'الريان', notes: '' },
  '3': { customer: 'فاطمة علي', service: 'نباتات صناعية', date: '2025-02-25', status: 'مكتمل', location: 'الدوحة', notes: '' },
  '4': { customer: 'خالد الدوسري', service: 'زراعة', date: '2025-02-24', status: 'قيد الانتظار', location: 'الخور', notes: '' },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const order = id ? orders[id] : null;

  if (!order) {
    return (
      <div>
        <Link to="/orders" className="text-gold hover:underline">← العودة للطلبات</Link>
        <p className="mt-4 text-gray-500">الطلب غير موجود.</p>
      </div>
    );
  }

  return (
    <>
      <Link to="/orders" className="mb-4 inline-block text-gold hover:underline">← العودة للطلبات</Link>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">تفاصيل الطلب #{id}</h1>
      <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm space-y-4">
        <p><span className="font-bold text-green-deep">العميل:</span> {order.customer}</p>
        <p><span className="font-bold text-green-deep">الخدمة:</span> {order.service}</p>
        <p><span className="font-bold text-green-deep">التاريخ:</span> {order.date}</p>
        <p><span className="font-bold text-green-deep">الحالة:</span> {order.status}</p>
        <p><span className="font-bold text-green-deep">الموقع:</span> {order.location}</p>
        {order.notes && <p><span className="font-bold text-green-deep">ملاحظات:</span> {order.notes}</p>}
      </div>
    </>
  );
}
