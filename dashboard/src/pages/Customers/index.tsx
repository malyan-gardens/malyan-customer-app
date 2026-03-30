import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

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
      <div style={{ background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 780, maxHeight: '90vh', overflow: 'auto' }}>
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

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
  created_at: string;
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    type: 'individual',
    notes: '',
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ orders: any[]; maintenance: any[]; design: any[] } | null>(null);

  async function fetchCustomers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    console.log('[customers] fetch', { data, error });
    if (error) {
      setError(error.message);
      setCustomers([]);
      setLoading(false);
      return;
    }
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q));
  }, [customers, query]);

  async function addCustomer() {
    setError(null);
    const payload = {
      name: addForm.name.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim(),
      address: addForm.address.trim(),
      type: addForm.type,
      notes: addForm.notes.trim(),
    };

    const { error } = await supabase.from('customers').insert(payload);
    if (error) {
      setError(error.message);
      return;
    }
    setShowAddModal(false);
    setAddForm({ name: '', phone: '', email: '', address: '', type: 'individual', notes: '' });
    fetchCustomers();
  }

  async function deleteCustomer(id: string, name?: string | null) {
    const ok = window.confirm(`هل أنت متأكد من حذف العميل «${name || ''}»؟`);
    if (!ok) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    fetchCustomers();
  }

  async function openHistory(c: Customer) {
    setSelectedCustomer(c);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistory(null);

    const phone = c.phone;
    if (!phone) {
      setHistoryLoading(false);
      setHistory({ orders: [], maintenance: [], design: [] });
      return;
    }

    const [ordersRes, maintRes, designRes] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_phone', phone).order('created_at', { ascending: false }),
      supabase.from('maintenance_requests').select('*').eq('customer_phone', phone).order('created_at', { ascending: false }),
      supabase.from('design_requests').select('*').eq('customer_phone', phone).order('created_at', { ascending: false }),
    ]);

    const orders = (ordersRes.data ?? []) as any[];
    const maintenance = (maintRes.data ?? []) as any[];
    const design = (designRes.data ?? []) as any[];

    if (ordersRes.error || maintRes.error || designRes.error) {
      setHistoryError((ordersRes.error ?? maintRes.error ?? designRes.error)?.message || 'فشل جلب تاريخ العميل');
    }

    setHistory({ orders, maintenance, design });
    setHistoryLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 14, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>👥 العملاء</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الهاتف..." style={{ ...styles.input, width: 260 }} />
          <button type="button" onClick={() => setShowAddModal(true)} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', borderRadius: 8, padding: '10px 18px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 800 }}>
            + إضافة عميل
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...styles.box, padding: 40, textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
      ) : error ? (
        <div style={{ ...styles.box, padding: 16, color: '#ef4444', marginBottom: 16 }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{ ...styles.box, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>{c.name || '—'}</div>
                  <div style={{ fontSize: 12, color: '#7a9480' }}>📞 {c.phone || '—'}</div>
                  <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>✉️ {c.email || '—'}</div>
                  <div style={{ marginTop: 10, display: 'inline-block', background: 'rgba(76,223,128,0.12)', border: '1px solid rgba(76,223,128,0.25)', color: '#4cdf80', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
                    {c.type || 'individual'}
                  </div>
                  <div style={{ fontSize: 11, color: '#7a9480', marginTop: 10 }}>تاريخ الإنشاء: {new Date(c.created_at).toLocaleDateString('ar')}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" onClick={() => openHistory(c)} style={{ background: '#080e0a', border: '1px solid #2a3d2e', borderRadius: 10, padding: '8px 12px', color: '#7a9480', cursor: 'pointer', fontWeight: 800 }}>
                    تاريخ العميل
                  </button>
                  <button type="button" onClick={() => deleteCustomer(c.id, c.name)} style={{ background: 'transparent', border: '1px solid rgba(224,82,82,0.35)', borderRadius: 10, padding: '8px 12px', color: '#e05252', cursor: 'pointer', fontWeight: 800 }}>
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <div style={{ ...styles.box, padding: 60, textAlign: 'center', color: '#4a6450' }}>لا يوجد نتائج</div> : null}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAddModal} title="إضافة عميل" onClose={() => setShowAddModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={styles.label}>الاسم</label>
            <input style={styles.input} value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>الهاتف</label>
            <input style={styles.input} value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>البريد</label>
            <input style={styles.input} value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>النوع</label>
            <select style={styles.input} value={addForm.type} onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="individual">individual</option>
              <option value="corporate">corporate</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>العنوان</label>
            <input style={styles.input} value={addForm.address} onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>ملاحظات</label>
            <textarea style={{ ...styles.input, minHeight: 90 }} value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: '1px solid #2a3d2e', color: '#7a9480', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>
            إلغاء
          </button>
          <button type="button" onClick={addCustomer} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', color: 'white', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            حفظ
          </button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal open={!!selectedCustomer} title={`تاريخ ${selectedCustomer?.name || ''}`} onClose={() => setSelectedCustomer(null)}>
        {historyLoading ? (
          <div style={{ color: '#7a9480' }}>جاري التحميل...</div>
        ) : historyError ? (
          <div style={{ color: '#ef4444' }}>{historyError}</div>
        ) : history ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div style={{ background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>الطلبات</div>
              {history.orders.length === 0 ? <div style={{ color: '#7a9480' }}>لا توجد طلبات</div> : null}
              <div style={{ display: 'grid', gap: 8 }}>
                {history.orders.slice(0, 10).map((o) => (
                  <div key={o.id} style={{ borderBottom: '1px solid rgba(42,61,46,0.5)', paddingBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#e8f0ea', fontWeight: 800 }}>#{String(o.id).slice(0, 6)}</div>
                    <div style={{ fontSize: 12, color: '#7a9480' }}>الحالة: {o.status}</div>
                    <div style={{ fontSize: 12, color: '#7a9480' }}>الإجمالي: {o.total_amount ?? 0} QAR</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>الصيانة</div>
              {history.maintenance.length === 0 ? <div style={{ color: '#7a9480' }}>لا توجد طلبات صيانة</div> : null}
            </div>
            <div style={{ background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>التصميم</div>
              {history.design.length === 0 ? <div style={{ color: '#7a9480' }}>لا توجد طلبات تصميم</div> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

