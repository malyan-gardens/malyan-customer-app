import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type OrderStatus = 'pending' | 'processing' | 'delivered' | 'cancelled';
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'معلق',
  processing: 'قيد التنفيذ',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

const styles = {
  page: {
    padding: 28,
    direction: 'rtl' as const,
    fontFamily: 'Cairo, Tajawal, sans-serif',
    color: '#e8f0ea',
    background: '#080e0a',
    minHeight: '100vh',
  },
  box: { background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 14 },
  input: {
    width: '100%',
    background: '#080e0a',
    border: '1px solid #2a3d2e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e8f0ea',
    outline: 'none',
    fontSize: 13,
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  label: { display: 'block', fontSize: 12, color: '#7a9480', marginBottom: 6 },
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const days = Math.floor(h / 24);
  return `منذ ${days} يوم`;
}

function formatQAR(n: number) {
  return new Intl.NumberFormat('ar-QA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' QAR';
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Cairo, Tajawal, sans-serif',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a3d2e',
              borderRadius: 10,
              padding: '6px 12px',
              color: '#7a9480',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            إغلاق
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type OrderRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: any[] | null;
  total_amount: number | null;
  payment_method: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  notes: string | null;
  status: OrderStatus | string;
  created_at: string;
};

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // yyyy-mm-dd

  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('[orders] fetch', { data, error: fetchErr });

    if (fetchErr) {
      setError(fetchErr.message || 'فشل جلب الطلبات');
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const st = o.status as OrderStatus;
      const statusOk = statusFilter === 'all' ? true : st === statusFilter;

      const dateOk = !dateFilter
        ? true
        : (o.delivery_date || '').slice(0, 10) === dateFilter;

      return statusOk && dateOk;
    });
  }, [orders, statusFilter, dateFilter]);

  async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    setUpdatingStatusId(orderId);
    setError(null);
    const { error: updateErr } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

    if (updateErr) {
      setError(updateErr.message || 'فشل تحديث الحالة');
      setUpdatingStatusId(null);
      return;
    }

    const { error: notifErr } = await supabase.from('notifications').insert({
      title: 'تحديث حالة طلب',
      message: `تم تغيير حالة الطلب إلى: ${STATUS_LABEL[newStatus]}`,
      type: 'order',
      reference_id: orderId,
      reference_type: 'orders',
      read: false,
    });

    if (notifErr) {
      console.warn('[orders] notification insert failed', notifErr);
    }

    await fetchOrders();
    setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: newStatus } : prev));
    setUpdatingStatusId(null);
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.box, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📦 الطلبات</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={styles.label}>الحالة</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(
                  [
                    { key: 'all' as const, label: 'الكل' },
                    { key: 'pending' as const, label: 'معلق' },
                    { key: 'processing' as const, label: 'قيد التنفيذ' },
                    { key: 'delivered' as const, label: 'تم التوصيل' },
                    { key: 'cancelled' as const, label: 'ملغي' },
                  ] as const
                ).map((b) => {
                  const active = statusFilter === b.key;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setStatusFilter(b.key as any)}
                      style={{
                        background: active ? '#1a7a3c' : '#080e0a',
                        border: `1px solid ${active ? 'rgba(76,223,128,0.55)' : '#2a3d2e'}`,
                        color: active ? 'white' : '#7a9480',
                        borderRadius: 10,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontWeight: 900,
                        fontSize: 12,
                      }}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ minWidth: 170 }}>
              <label style={styles.label}>التاريخ</label>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={styles.input} />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ ...styles.box, padding: 40, textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
      ) : error ? (
        <div style={{ ...styles.box, padding: 16, color: '#ef4444', marginBottom: 16 }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((o) => {
            const itemsCount = Array.isArray(o.items) ? o.items.length : 0;
            const st = (o.status as OrderStatus) || 'pending';
            const color = STATUS_COLOR[st] || '#7a9480';
            return (
              <div
                key={o.id}
                style={{ ...styles.box, padding: 18, cursor: 'pointer' }}
                onClick={() => setSelectedOrder(o)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6, color: '#e8f0ea' }}>
                      {o.customer_name || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#7a9480' }}>📞 {o.customer_phone || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>
                      🗓 {o.delivery_date || '—'} {o.delivery_time ? `• ${o.delivery_time}` : ''}
                    </div>
                  </div>

                  <span
                    style={{
                      background: `${color}22`,
                      border: `1px solid ${color}55`,
                      color,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {STATUS_LABEL[st] || o.status}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 10 }}>
                  <div style={{ fontSize: 12, color: '#7a9480' }}>العناصر: {itemsCount}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#e8f0ea' }}>الإجمالي: {formatQAR(Number(o.total_amount ?? 0))}</div>
                </div>

                {o.notes ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#7a9480', whiteSpace: 'pre-line' }}>
                    ملاحظات: {o.notes}
                  </div>
                ) : null}

                <div style={{ marginTop: 14 }}>
                  <label style={{ ...styles.label, marginBottom: 6 }}>تغيير الحالة</label>
                  <select
                    value={st}
                    disabled={updatingStatusId === o.id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                    style={{ ...styles.input, padding: '8px 12px' }}
                  >
                    <option value="pending">pending</option>
                    <option value="processing">processing</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!selectedOrder}
        title={`تفاصيل الطلب ${selectedOrder?.id ? `#${selectedOrder.id.slice(0, 6)}` : ''}`}
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{selectedOrder.customer_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#7a9480' }}>📞 {selectedOrder.customer_phone || '—'}</div>
                <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>
                  📅 {selectedOrder.delivery_date || '—'} • 🕒 {selectedOrder.delivery_time || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>
                  💳 طريقة الدفع: {selectedOrder.payment_method || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#e8f0ea' }}>
                  الإجمالي: {formatQAR(Number(selectedOrder.total_amount ?? 0))}
                </div>
                <div style={{ fontSize: 11, color: '#7a9480', marginTop: 6 }}>
                  {timeAgo(selectedOrder.created_at)}
                </div>
              </div>
            </div>

            {selectedOrder.notes ? (
              <div style={{ background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>ملاحظات</div>
                <div style={{ fontSize: 12, color: '#7a9480', whiteSpace: 'pre-line' }}>{selectedOrder.notes}</div>
              </div>
            ) : null}

            <div style={{ background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 800 }}>العناصر ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</div>
              </div>
              <pre style={{ marginTop: 10, fontSize: 12, color: '#7a9480', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedOrder.items ?? [], null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: '100%', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={{ ...styles.label, marginBottom: 6 }}>تغيير الحالة</label>
                  <select
                    value={(selectedOrder.status as OrderStatus) || 'pending'}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    style={{ ...styles.input, padding: '8px 12px' }}
                    disabled={updatingStatusId === selectedOrder.id}
                  >
                    <option value="pending">pending</option>
                    <option value="processing">processing</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('الدفع عبر QNB قيد التطوير — قريباً')}
                style={{
                  background: '#080e0a',
                  border: '1px solid #2a3d2e',
                  borderRadius: 10,
                  padding: '10px 16px',
                  color: '#7a9480',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                الدفع عبر QNB (قريباً)
              </button>

              <button
                type="button"
                onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                disabled={updatingStatusId === selectedOrder.id}
                style={{
                  background: 'linear-gradient(135deg, #1a7a3c, #22a84f)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 16px',
                  color: 'white',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                وضع: delivered
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

