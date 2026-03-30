import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Status = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
const STATUS_LABEL: Record<string, string> = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};
const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  in_progress: '#8b5cf6',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const styles = {
  page: { padding: 28, direction: 'rtl' as const, fontFamily: 'Cairo, Tajawal, sans-serif', color: '#e8f0ea', background: '#080e0a', minHeight: '100vh' },
  box: { background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 14 },
  input: {
    width: '100%',
    background: '#080e0a',
    border: '1px solid #2a3d2e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e8f0ea',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: { display: 'block' as const, fontSize: 12, color: '#7a9480', marginBottom: 6 },
};

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
        direction: 'rtl',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a3d2e', borderRadius: 10, padding: '6px 12px', color: '#7a9480', cursor: 'pointer', fontFamily: 'inherit' }}>
            إغلاق
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type MaintenanceRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  location: string | null;
  notes: string | null;
  status: Status | string;
  assigned_to: string | null;
  total_amount: number | null;
  created_at: string;
};

export default function Maintenance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [filter, setFilter] = useState<'all' | Status>('all');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_type: 'شهرية',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
    assigned_to: '',
    total_amount: '',
    status: 'pending' as Status,
  });

  async function fetchRows() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data as MaintenanceRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function addRequest() {
    const payload = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      service_type: form.service_type,
      scheduled_date: form.scheduled_date.trim(),
      scheduled_time: form.scheduled_time.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      assigned_to: form.assigned_to.trim(),
      total_amount: Number(form.total_amount) || 0,
      status: form.status,
    };
    const { error } = await supabase.from('maintenance_requests').insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setShowAdd(false);
    setForm({
      customer_name: '',
      customer_phone: '',
      service_type: 'شهرية',
      scheduled_date: '',
      scheduled_time: '',
      location: '',
      notes: '',
      assigned_to: '',
      total_amount: '',
      status: 'pending',
    });
    fetchRows();
  }

  async function updateStatus(id: string, newStatus: Status) {
    const { error } = await supabase.from('maintenance_requests').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    await supabase.from('notifications').insert({
      title: 'تحديث طلب صيانة',
      message: `تم تغيير حالة الصيانة إلى: ${STATUS_LABEL[newStatus]}`,
      type: 'maintenance',
      reference_id: id,
      reference_type: 'maintenance_requests',
      read: false,
    });
    fetchRows();
  }

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 14, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🔧 الصيانة</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={styles.label}>التصفية</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  { key: 'all' as const, label: 'الكل' },
                  { key: 'pending' as const, label: 'معلق' },
                  { key: 'confirmed' as const, label: 'مؤكد' },
                  { key: 'in_progress' as const, label: 'قيد التنفيذ' },
                  { key: 'completed' as const, label: 'مكتمل' },
                  { key: 'cancelled' as const, label: 'ملغي' },
                ] as const
              ).map((b) => {
                const active = filter === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setFilter(b.key as any)}
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
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', borderRadius: 8, padding: '10px 18px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 900 }}
          >
            + إضافة طلب
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...styles.box, padding: 40, textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
      ) : error ? (
        <div style={{ ...styles.box, padding: 16, color: '#ef4444', marginBottom: 16 }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((r) => {
            const st = r.status as Status;
            const color = STATUS_COLOR[st] || '#7a9480';
            return (
              <div key={r.id} style={{ ...styles.box, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{r.customer_name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480' }}>📞 {r.customer_phone || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>📍 {r.location || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>🗓 {r.scheduled_date || '—'} • 🕒 {r.scheduled_time || '—'}</div>
                  </div>
                  <span style={{ background: `${color}22`, border: `1px solid ${color}55`, color, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    {STATUS_LABEL[st] || r.status}
                  </span>
                </div>

                <div style={{ marginTop: 12, fontSize: 13, color: '#7a9480' }}>الخدمة: {r.service_type || '—'}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#7a9480' }}>المبلغ: {r.total_amount ?? 0} QAR</div>
                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>تغيير الحالة</label>
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value as Status)}
                    style={{ ...styles.input, padding: '8px 12px' }}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>

                {r.notes ? (
                  <div style={{ marginTop: 12, background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12, color: '#7a9480', fontSize: 12, whiteSpace: 'pre-line' }}>
                    <div style={{ color: '#e8f0ea', fontWeight: 900, marginBottom: 6 }}>ملاحظات</div>
                    {r.notes}
                  </div>
                ) : null}
              </div>
            );
          })}
          {filtered.length === 0 ? <div style={{ ...styles.box, padding: 60, textAlign: 'center', color: '#4a6450' }}>لا توجد طلبات</div> : null}
        </div>
      )}

      <Modal open={showAdd} title="إضافة طلب صيانة" onClose={() => setShowAdd(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={styles.label}>اسم العميل</label>
            <input style={styles.input} value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>هاتف العميل</label>
            <input style={styles.input} value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>نوع الخدمة</label>
            <select style={styles.input} value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}>
              <option value="شهرية">شهرية</option>
              <option value="ربع سنوية">ربع سنوية</option>
              <option value="طارئة">طارئة</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>المبلغ (QAR)</label>
            <input style={styles.input} type="number" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>التاريخ</label>
            <input style={styles.input} value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label style={styles.label}>الوقت</label>
            <input style={styles.input} value={form.scheduled_time} onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))} placeholder="HH:MM" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>الموقع</label>
            <input style={styles.input} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>ملاحظات</label>
            <textarea style={{ ...styles.input, minHeight: 90 }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>المسؤول</label>
            <input style={styles.input} value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))} placeholder="اسم الموظف" />
          </div>
          <div>
            <label style={styles.label}>الحالة</label>
            <select style={styles.input} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: '1px solid #2a3d2e', color: '#7a9480', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            إلغاء
          </button>
          <button type="button" onClick={addRequest} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', color: 'white', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            حفظ
          </button>
        </div>
      </Modal>
    </div>
  );
}

