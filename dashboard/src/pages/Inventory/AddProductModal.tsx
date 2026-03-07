import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { value: 'natural', label: 'نباتات طبيعية' },
  { value: 'artificial', label: 'نباتات صناعية' },
  { value: 'soil_supplies', label: 'تربة ومستلزمات' },
  { value: 'other', label: 'أخرى' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#080e0a',
  border: '1px solid #2a3d2e',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#e8f0ea',
  fontFamily: 'inherit',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#7a9480',
  marginBottom: 6,
};

export default function AddProductModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name_ar: '',
    cost_price: '',
    sell_price: '',
    quantity: '',
    category: 'other',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function handleSave() {
    setError('');
    if (!form.name_ar.trim()) {
      setError('أدخل اسم المنتج');
      return;
    }
    const sellPrice = parseFloat(form.sell_price);
    const costPrice = parseFloat(form.cost_price) || 0;
    const quantity = parseInt(form.quantity, 10) || 0;
    if (isNaN(sellPrice) || sellPrice < 0) {
      setError('سعر البيع غير صحيح');
      return;
    }

    setSaving(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('inventory-images')
          .upload(path, imageFile, { upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
        // إذا فشل الرفع: نكمل الحفظ بدون صورة (الصورة اختيارية)
      } catch {
        // أي خطأ في الرفع: نكمل بدون صورة
      }
    }

    try {
      const { error: insertErr } = await supabase.from('inventory').insert({
        name_ar: form.name_ar.trim(),
        image_url: imageUrl,
        cost_price: costPrice,
        sell_price: sellPrice,
        quantity: quantity,
        category: form.category,
      });

      if (insertErr) {
        setError(insertErr.message || 'فشل الحفظ');
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

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
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8f0ea', marginBottom: 20 }}>
          + إضافة منتج جديد
        </h2>

        {error && (
          <div
            style={{
              background: 'rgba(224,82,82,0.1)',
              border: '1px solid rgba(224,82,82,0.3)',
              borderRadius: 8,
              padding: 10,
              color: '#e05252',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>اسم المنتج (عربي)</label>
          <input
            type="text"
            placeholder="مثال: نخلة صناعية 160 سم"
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>صورة المنتج</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '1px dashed #2a3d2e',
              borderRadius: 8,
              padding: 20,
              textAlign: 'center',
              cursor: 'pointer',
              background: '#080e0a',
              color: '#7a9480',
              fontSize: 13,
            }}
          >
            {imagePreview ? (
              <div>
                <img
                  src={imagePreview}
                  alt="معاينة"
                  style={{ maxHeight: 120, borderRadius: 8, marginBottom: 8 }}
                />
                <div>اضغط لتغيير الصورة</div>
              </div>
            ) : (
              'اضغط لاختيار صورة (اختياري)'
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>سعر الشراء (QAR)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0"
              value={form.cost_price}
              onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>سعر البيع (QAR)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0"
              value={form.sell_price}
              onChange={(e) => setForm((f) => ({ ...f, sell_price: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>الكمية</label>
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>الفئة</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a3d2e',
              borderRadius: 8,
              padding: '10px 20px',
              color: '#7a9480',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #1a7a3c, #22a84f)',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              color: 'white',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
