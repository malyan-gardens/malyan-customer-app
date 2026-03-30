import { useEffect, useMemo, useRef, useState } from 'react';
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
      <div style={{ background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 920, maxHeight: '90vh', overflow: 'auto' }}>
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

type DesignStatus = 'new' | 'reviewing' | 'proposal_sent' | 'approved' | 'in_progress' | 'completed';

const STATUS_LABEL: Record<string, string> = {
  new: 'جديد',
  reviewing: 'قيد المراجعة',
  proposal_sent: 'تم إرسال عرض',
  approved: 'تمت الموافقة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};

type DesignRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  project_type: string | null;
  location: string | null;
  area_sqm: number | null;
  budget_range: number | null;
  style_preference: string | null;
  notes: string | null;
  internal_notes: string | null;
  proposal_url: string | null;
  status: DesignStatus | string;
  assigned_to: string | null;
  total_amount: number | null;
  created_at: string;
};

async function uploadOptional(file: File | null): Promise<string | null> {
  if (!file) return null;
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  console.log('[design] upload start', { bucket: 'inventory-images', fileName });
  const uploadPromise = supabase.storage.from('inventory-images').upload(fileName, file, { upsert: true });
  const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
    setTimeout(() => resolve({ data: null, error: { message: 'انتهت مهلة رفع المرفق' } }), 8000)
  );

  const result = await Promise.race([uploadPromise, timeoutPromise]);
  const uploadErr = (result as any).error;
  console.log('[design] upload result', result);
  if (uploadErr) {
    console.warn('[design] upload failed, continue without attachment', uploadErr);
    return null;
  }

  const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl((result as any).data?.path || fileName);
  return urlData.publicUrl ?? null;
}

export default function Design() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DesignRow[]>([]);
  const [filter, setFilter] = useState<'all' | DesignStatus>('all');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    project_type: 'مكتب',
    location: '',
    area_sqm: '',
    budget_range: '',
    style_preference: '',
    notes: '',
    internal_notes: '',
    proposal_url: '',
    status: 'new' as DesignStatus,
    assigned_to: '',
    total_amount: '',
  });
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const proposalInputRef = useRef<HTMLInputElement>(null);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('design_requests').select('*').order('created_at', { ascending: false });
    console.log('[design] fetch', { data, error });
    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data as DesignRow[]) ?? []);
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
    let proposalUrl = form.proposal_url || null;
    if (proposalFile) {
      const uploadedUrl = await uploadOptional(proposalFile);
      if (uploadedUrl) proposalUrl = uploadedUrl;
    }

    const payload = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      project_type: form.project_type,
      location: form.location.trim(),
      area_sqm: Number(form.area_sqm) || 0,
      budget_range: Number(form.budget_range) || 0,
      style_preference: form.style_preference.trim(),
      notes: form.notes.trim(),
      internal_notes: form.internal_notes.trim(),
      proposal_url: proposalUrl,
      status: form.status,
      assigned_to: form.assigned_to.trim(),
      total_amount: Number(form.total_amount) || 0,
    };

    const { error } = await supabase.from('design_requests').insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setShowAdd(false);
    setProposalFile(null);
    fetchRows();
  }

  async function updateStatus(id: string, newStatus: DesignStatus) {
    const { error } = await supabase.from('design_requests').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    await supabase.from('notifications').insert({
      title: 'تحديث طلب تصميم',
      message: `تم تغيير حالة التصميم إلى: ${STATUS_LABEL[newStatus]}`,
      type: 'design',
      reference_id: id,
      reference_type: 'design_requests',
      read: false,
    });
    fetchRows();
  }

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 14, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🎨 التصميم</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={styles.label}>التصفية</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ ...styles.input, width: 230 }}>
              <option value="all">الكل</option>
              <option value="new">جديد</option>
              <option value="reviewing">قيد المراجعة</option>
              <option value="proposal_sent">تم إرسال عرض</option>
              <option value="approved">تمت الموافقة</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتمل</option>
            </select>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map((r) => {
            const color =
              r.status === 'new'
                ? '#f59e0b'
                : r.status === 'reviewing'
                  ? '#3b82f6'
                  : r.status === 'proposal_sent'
                    ? '#8b5cf6'
                    : r.status === 'approved'
                      ? '#22c55e'
                      : r.status === 'in_progress'
                        ? '#4cdf80'
                        : '#94a3b8';
            return (
              <div key={r.id} style={{ ...styles.box, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{r.customer_name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>📞 {r.customer_phone || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>📍 {r.location || '—'}</div>
                  </div>
                  <span style={{ background: `${color}22`, border: `1px solid ${color}55`, color, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    {STATUS_LABEL[String(r.status)] || r.status}
                  </span>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: '#7a9480' }}>نوع المشروع: {r.project_type || '—'}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#7a9480' }}>المساحة: {r.area_sqm ?? 0} م²</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#7a9480' }}>الميزانية: {r.budget_range ?? 0} QAR</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#7a9480' }}>التصميم: {r.style_preference || '—'}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#7a9480' }}>الإجمالي: {r.total_amount ?? 0} QAR</div>

                <div style={{ marginTop: 12 }}>
                  <label style={styles.label}>تغيير الحالة</label>
                  <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as DesignStatus)} style={{ ...styles.input, padding: '8px 12px' }}>
                    <option value="new">new</option>
                    <option value="reviewing">reviewing</option>
                    <option value="proposal_sent">proposal_sent</option>
                    <option value="approved">approved</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                  </select>
                </div>

                {(r.notes || r.internal_notes) ? (
                  <div style={{ marginTop: 12, background: '#162019', border: '1px solid #2a3d2e', borderRadius: 12, padding: 12 }}>
                    {r.notes ? <div style={{ marginBottom: 8, color: '#e8f0ea', fontWeight: 900, fontSize: 12 }}>ملاحظات العميل</div> : null}
                    {r.notes ? <div style={{ fontSize: 12, color: '#7a9480', whiteSpace: 'pre-line' }}>{r.notes}</div> : null}
                    {r.internal_notes ? <div style={{ marginTop: 10, color: '#e8f0ea', fontWeight: 900, fontSize: 12 }}>ملاحظات داخلية</div> : null}
                    {r.internal_notes ? <div style={{ fontSize: 12, color: '#7a9480', whiteSpace: 'pre-line' }}>{r.internal_notes}</div> : null}
                  </div>
                ) : null}

                {r.proposal_url ? (
                  <div style={{ marginTop: 12 }}>
                    <a href={r.proposal_url} target="_blank" rel="noreferrer" style={{ color: '#4cdf80', fontWeight: 900 }}>فتح العرض/الاقتباس</a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} title="إضافة طلب تصميم" onClose={() => setShowAdd(false)}>
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
            <label style={styles.label}>نوع المساحة</label>
            <select style={styles.input} value={form.project_type} onChange={(e) => setForm((f) => ({ ...f, project_type: e.target.value }))}>
              <option value="مكتب">مكتب</option>
              <option value="فندق">فندق</option>
              <option value="منزل">منزل</option>
              <option value="حديقة">حديقة</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>الموقع</label>
            <input style={styles.input} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>المساحة (م²)</label>
            <input style={styles.input} type="number" value={form.area_sqm} onChange={(e) => setForm((f) => ({ ...f, area_sqm: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>الميزانية</label>
            <input style={styles.input} type="number" value={form.budget_range} onChange={(e) => setForm((f) => ({ ...f, budget_range: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>تفضيل الستايل</label>
            <input style={styles.input} value={form.style_preference} onChange={(e) => setForm((f) => ({ ...f, style_preference: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>المسؤول</label>
            <input style={styles.input} value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>ملاحظات العميل</label>
            <textarea style={{ ...styles.input, minHeight: 90 }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>ملاحظات داخلية</label>
            <textarea style={{ ...styles.input, minHeight: 90 }} value={form.internal_notes} onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>رابط العرض/الاقتباس (اختياري)</label>
            <input style={styles.input} value={form.proposal_url} onChange={(e) => setForm((f) => ({ ...f, proposal_url: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>أرفق ملف (اختياري)</label>
            <input ref={proposalInputRef} type="file" accept="image/*,.pdf" onChange={(e) => setProposalFile(e.target.files?.[0] ?? null)} style={{ color: '#e8f0ea' }} />
          </div>
          <div>
            <label style={styles.label}>الحالة</label>
            <select style={styles.input} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DesignStatus }))}>
              <option value="new">new</option>
              <option value="reviewing">reviewing</option>
              <option value="proposal_sent">proposal_sent</option>
              <option value="approved">approved</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>الإجمالي (QAR)</label>
            <input style={styles.input} type="number" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))} />
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

