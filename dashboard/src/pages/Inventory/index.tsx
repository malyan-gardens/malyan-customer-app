import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AddProductModal, { type InventoryProductRow } from './AddProductModal';

const CATEGORY_LABELS: Record<string, string> = {
  natural: 'نباتات طبيعية',
  artificial: 'نباتات صناعية',
  soil_supplies: 'تربة ومستلزمات',
  other: 'أخرى',
};

const boxStyle = { background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 14 };

const iconBtnStyle: React.CSSProperties = {
  border: '1px solid #2a3d2e',
  background: '#162019',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: '#7a9480',
};

export default function Inventory() {
  const [products, setProducts] = useState<InventoryProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProductRow | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchProducts() {
    setLoading(true);
    setFetchError(null);

    try {
      console.log('[inventory] supabase client ready:', Boolean(supabase));
      const result = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = result;
      console.log('[inventory] full fetch result', result);

      if (error) {
        console.error('[inventory] fetch error detail', error);
        setProducts([]);
        setFetchError(`فشل جلب المخزون: ${error.message}`);
        return;
      }

      setProducts((data as InventoryProductRow[]) ?? []);
    } catch (e) {
      console.error('[inventory] fetch exception', e);
      setProducts([]);
      setFetchError(`فشل جلب المخزون: ${e instanceof Error ? e.message : 'خطأ غير متوقع'}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function handleDelete(p: InventoryProductRow) {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف «${p.name_ar}»؟\nلا يمكن التراجع عن هذا الإجراء.`
      )
    ) {
      return;
    }
    const { error } = await supabase.from('inventory').delete().eq('id', p.id);
    if (error) {
      alert(error.message || 'فشل الحذف');
      console.error('[inventory] delete', error);
      return;
    }
    await fetchProducts();
  }

  function openAddModal() {
    setEditingProduct(null);
    setShowModal(true);
  }

  function openEditModal(p: InventoryProductRow) {
    setEditingProduct(p);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProduct(null);
  }

  function formatQAR(n: number) {
    return new Intl.NumberFormat('ar-QA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' QAR';
  }

  return (
    <div style={{ padding: 28, direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8f0ea', marginBottom: 8 }}>📦 المخزون</h1>
          <p style={{ fontSize: 12, color: '#5a7058', margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
            الكميات والأسعار هنا هي المصدر الوحيد للحقيقة — تطبيق العملاء يقرأ نفس قاعدة البيانات ويعكس التغييرات تلقائياً.
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            background: 'linear-gradient(135deg, #1a7a3c, #22a84f)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            color: 'white',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + إضافة منتج
        </button>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ ...boxStyle, padding: 60, textAlign: 'center', color: '#4a6450' }}>
          {fetchError && (
            <div
              style={{
                background: 'rgba(224,82,82,0.12)',
                border: '1px solid rgba(224,82,82,0.35)',
                borderRadius: 10,
                padding: 14,
                color: '#e05252',
                fontSize: 13,
                marginBottom: 20,
                textAlign: 'right',
                whiteSpace: 'pre-line',
              }}
            >
              {fetchError}
            </div>
          )}
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>لا يوجد منتجات في المخزون</div>
          <button
            onClick={openAddModal}
            style={{
              marginTop: 16,
              background: '#1a7a3c',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              color: 'white',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + أضف أول منتج
          </button>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                ...boxStyle,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  height: 160,
                  background: '#162019',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name_ar}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 48, opacity: 0.4 }}>🪴</span>
                )}
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f0ea', margin: 0, flex: 1 }}>{p.name_ar}</h3>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      title="تعديل"
                      aria-label="تعديل المنتج"
                      onClick={() => openEditModal(p)}
                      style={iconBtnStyle}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      aria-label="حذف المنتج"
                      onClick={() => handleDelete(p)}
                      style={{ ...iconBtnStyle, borderColor: 'rgba(224,82,82,0.35)', color: '#c06060' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    color: '#7a9480',
                    background: 'rgba(76,223,128,0.15)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    marginBottom: 10,
                    alignSelf: 'flex-start',
                  }}
                >
                  {CATEGORY_LABELS[p.category] ?? p.category}
                </span>
                <div style={{ fontSize: 13, color: '#7a9480', marginBottom: 4 }}>
                  شراء: <span style={{ color: '#e8f0ea' }}>{formatQAR((p.purchase_price ?? p.cost_price ?? 0) as number)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#7a9480', marginBottom: 4 }}>
                  بيع:{' '}
                  <span style={{ color: '#4cdf80', fontWeight: 700 }}>
                    {formatQAR((p.selling_price ?? p.sell_price ?? 0) as number)}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.quantity > 0 ? '#4cdf80' : '#e05252', marginTop: 'auto' }}>
                  الكمية: {p.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddProductModal
          product={editingProduct}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
