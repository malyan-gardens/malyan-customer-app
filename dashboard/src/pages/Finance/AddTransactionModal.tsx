import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface Category {
  id: string;
  name_ar: string;
  icon: string | null;
}

export default function AddTransactionModal({ onClose, onSaved }: Props) {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('finance_categories')
      .select('*')
      .eq('type', type)
      .then(({ data }) => {
        setCategories(data ?? []);
        setForm((f) => ({ ...f, category_id: data?.[0]?.id ?? '' }));
      });
  }, [type]);

  async function handleSave() {
    if (!form.amount || !form.description || !form.category_id) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('finance_transactions').insert({
      type,
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      payment_method: form.payment_method,
      notes: form.notes || null,
      created_by: user?.id,
    });

    setSaving(false);
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#080e0a',
    border: '1px solid #2a3d2e',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e8f0ea',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: '#7a9480',
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        fontFamily: 'Cairo, Tajawal, sans-serif',
        direction: 'rtl',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#0f1a12',
          border: '1px solid #2a3d2e',
          borderRadius: '16px',
          padding: '28px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e8f0ea', marginBottom: '20px' }}>
          + إضافة حركة مالية
        </h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background:
                  type === t
                    ? t === 'income'
                      ? 'rgba(26,122,60,0.3)'
                      : 'rgba(224,82,82,0.2)'
                    : '#162019',
                color: type === t ? (t === 'income' ? '#4cdf80' : '#e05252') : '#7a9480',
                fontFamily: 'Cairo, Tajawal, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor:
                  type === t
                    ? t === 'income'
                      ? '#1a7a3c'
                      : 'rgba(224,82,82,0.3)'
                    : '#2a3d2e',
              }}
            >
              {t === 'income' ? '📈 دخل' : '📉 مصروف'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>الفئة</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              style={inputStyle}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name_ar}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>المبلغ (QAR)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>الوصف</label>
          <input
            type="text"
            placeholder="مثال: مبيعات نباتات لعميل..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>طريقة الدفع</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              style={inputStyle}
            >
              <option value="cash">نقدي</option>
              <option value="qnb_transfer">QNB تحويل</option>
              <option value="qnb_card">QNB بطاقة</option>
              <option value="check">شيك</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>ملاحظات (اختياري)</label>
          <textarea
            placeholder="أي تفاصيل إضافية..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a3d2e',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#7a9480',
              fontFamily: 'Cairo, Tajawal, sans-serif',
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #1a7a3c, #22a84f)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              color: 'white',
              fontFamily: 'Cairo, Tajawal, sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
