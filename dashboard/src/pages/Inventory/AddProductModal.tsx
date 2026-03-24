import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/** يطابق صفوف جدول inventory من Supabase */
export interface InventoryProductRow {
  id: string;
  name_ar: string;
  image_url: string | null;
  purchase_price?: number | null;
  selling_price?: number | null;
  cost_price?: number | null;
  sell_price?: number | null;
  quantity: number;
  category: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  /** إن وُجد: وضع التعديل مع تعبئة الحقول */
  product?: InventoryProductRow | null;
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

function purchaseFromRow(p: InventoryProductRow): string {
  const v = p.purchase_price ?? p.cost_price;
  if (v == null) return '';
  return String(v);
}

function sellingFromRow(p: InventoryProductRow): string {
  const v = p.selling_price ?? p.sell_price;
  if (v == null) return '';
  return String(v);
}

export default function AddProductModal({ onClose, onSaved, product }: Props) {
  const isEdit = Boolean(product?.id);

  const [formData, setFormData] = useState({
    name_ar: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    category: 'other',
  });
  /** معاينة ملف جديد محلي */
  const [objectPreviewUrl, setObjectPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name_ar: product.name_ar ?? '',
        purchase_price: purchaseFromRow(product),
        selling_price: sellingFromRow(product),
        quantity: String(product.quantity ?? 0),
        category: product.category || 'other',
      });
      setExistingImageUrl(product.image_url);
      setImageFile(null);
      if (objectPreviewUrl) {
        URL.revokeObjectURL(objectPreviewUrl);
        setObjectPreviewUrl(null);
      }
    } else {
      setFormData({
        name_ar: '',
        purchase_price: '',
        selling_price: '',
        quantity: '',
        category: 'other',
      });
      setExistingImageUrl(null);
      setImageFile(null);
      if (objectPreviewUrl) {
        URL.revokeObjectURL(objectPreviewUrl);
        setObjectPreviewUrl(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- إعادة تعيين عند تغيير المنتج/الوضع فقط
  }, [product?.id]);

  useEffect(() => {
    return () => {
      if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl);
    };
  }, [objectPreviewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl);
    setImageFile(file);
    setObjectPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!imageFile) {
      console.log('[inventory] upload skipped: no new file selected');
      return existingImageUrl;
    }
    console.log('[inventory] upload start', {
      bucket: 'inventory-images',
      fileName: imageFile.name,
      fileSize: imageFile.size,
      mimeType: imageFile.type,
    });
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadPromise = supabase.storage
      .from('inventory-images')
      .upload(path, imageFile, { upsert: true, cacheControl: '3600' });
    const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(() => {
        console.warn('[inventory] upload timeout after 8s');
        resolve({ error: { message: 'انتهت مهلة رفع الصورة (8 ثوانٍ)' } });
      }, 8000)
    );
    const uploadResult = (await Promise.race([uploadPromise, timeoutPromise])) as {
      error: { message?: string } | null;
    };
    const uploadErr = uploadResult.error;
    if (uploadErr) {
      console.error('[inventory] storage upload failed', uploadErr);
      throw new Error(uploadErr.message || 'فشل رفع الصورة');
    }
    console.log('[inventory] upload success', { bucket: 'inventory-images', path });
    const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(path);
    console.log('[inventory] public URL generated', { publicUrl: urlData.publicUrl });
    return urlData.publicUrl ?? null;
  }

  const handleSave = async () => {
    if (!formData.name_ar.trim()) {
      setError('أدخل اسم المنتج');
      return;
    }

    setSaving(true);
    setError(null);
    setWarning(null);
    try {
      let imageUrl: string | null = existingImageUrl;
      if (imageFile) {
        try {
          imageUrl = await uploadImageIfNeeded();
        } catch (uploadError: unknown) {
          const uploadMsg = uploadError instanceof Error ? uploadError.message : 'فشل رفع الصورة';
          console.warn('[inventory] continue saving without image', uploadMsg);
          setWarning(`تم الحفظ بدون صورة\n(${uploadMsg})`);
          imageUrl = existingImageUrl;
        }
      }

      const row = {
        name_ar: formData.name_ar.trim(),
        category: formData.category || 'other',
        purchase_price: Number(formData.purchase_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        quantity: Number(formData.quantity) || 0,
        image_url: imageUrl,
      };

      if (isEdit && product) {
        console.log('[inventory] update product', { id: product.id, row });
        const { error: upErr } = await supabase.from('inventory').update(row).eq('id', product.id);
        if (upErr) throw upErr;
      } else {
        console.log('[inventory] insert product', row);
        const { error: insErr } = await supabase.from('inventory').insert([row]);
        if (insErr) throw insErr;
      }

      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل الحفظ';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = objectPreviewUrl || existingImageUrl;

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
          {isEdit ? '✏️ تعديل منتج' : '+ إضافة منتج جديد'}
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
              whiteSpace: 'pre-line',
            }}
          >
            {error}
          </div>
        )}
        {warning && !error && (
          <div
            style={{
              background: 'rgba(245,166,35,0.12)',
              border: '1px solid rgba(245,166,35,0.35)',
              borderRadius: 8,
              padding: 10,
              color: '#f5a623',
              fontSize: 13,
              marginBottom: 16,
              whiteSpace: 'pre-line',
            }}
          >
            {warning}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>اسم المنتج (عربي)</label>
          <input
            type="text"
            placeholder="مثال: نخلة صناعية 160 سم"
            value={formData.name_ar}
            onChange={(e) => setFormData((f) => ({ ...f, name_ar: e.target.value }))}
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
            {previewSrc ? (
              <div>
                <img
                  src={previewSrc}
                  alt="معاينة"
                  style={{ maxHeight: 120, borderRadius: 8, marginBottom: 8, objectFit: 'contain' }}
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
              value={formData.purchase_price}
              onChange={(e) => setFormData((f) => ({ ...f, purchase_price: e.target.value }))}
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
              value={formData.selling_price}
              onChange={(e) => setFormData((f) => ({ ...f, selling_price: e.target.value }))}
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
              value={formData.quantity}
              onChange={(e) => setFormData((f) => ({ ...f, quantity: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>الفئة</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
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
            {saving ? '⏳ جاري الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '💾 حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
