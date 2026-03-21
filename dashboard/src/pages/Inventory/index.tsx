import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AddProductModal from './AddProductModal';

interface Product {
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

const CATEGORY_LABELS: Record<string, string> = {
  natural: 'نباتات طبيعية',
  artificial: 'نباتات صناعية',
  soil_supplies: 'تربة ومستلزمات',
  other: 'أخرى',
};

const boxStyle = { background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 14 };

const FETCH_TIMEOUT_MS = 5000;

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  /** سبب عرض قائمة فارغة: مهلة، خطأ، أو RLS */
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);

  async function fetchProducts() {
    setLoading(true);
    setFetchWarning(null);

    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      let urlHost = '—';
      try {
        if (url) urlHost = new URL(url).host;
      } catch {
        urlHost = 'invalid';
      }
      console.log('[inventory] fetch — env check', {
        viteUrlHost: urlHost,
        viteKeySet: Boolean(key && String(key).length > 20),
      });

      const queryPromise = supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<{ __timedOut: true }>((resolve) =>
        setTimeout(() => resolve({ __timedOut: true }), FETCH_TIMEOUT_MS)
      );

      const outcome = await Promise.race([queryPromise, timeoutPromise]);

      if (outcome && '__timedOut' in outcome && outcome.__timedOut) {
        console.warn(
          `[inventory] fetch timed out after ${FETCH_TIMEOUT_MS}ms — showing empty state (check RLS / network / Supabase project)`
        );
        setProducts([]);
        setFetchWarning(
          'انتهت مهلة تحميل المخزون. قد تكون صلاحيات القراءة على جدول inventory غير مفعّلة للمفتاح anon (RLS).'
        );
        return;
      }

      const { data, error } = outcome as { data: Product[] | null; error: { message: string; code?: string } | null };
      console.log('[inventory] fetch result', { data, error, rowCount: data?.length ?? 0 });

      if (error) {
        console.error('[inventory] fetch error detail', error);
        setProducts([]);
        setFetchWarning(error.message || 'فشل جلب المخزون (تحقق من RLS والمفتاح anon)');
        return;
      }

      setProducts((data as Product[]) ?? []);
    } catch (e) {
      console.error('[inventory] fetch exception', e);
      setProducts([]);
      setFetchWarning(e instanceof Error ? e.message : 'خطأ غير متوقع أثناء جلب المخزون');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function formatQAR(n: number) {
    return new Intl.NumberFormat('ar-QA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' QAR';
  }

  return (
    <div style={{ padding: 28, direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8f0ea' }}>📦 المخزون</h1>
        <button
          onClick={() => setShowModal(true)}
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
          {fetchWarning && (
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
              {fetchWarning}
            </div>
          )}
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>لا يوجد منتجات في المخزون</div>
          <button
            onClick={() => setShowModal(true)}
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
                }}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name_ar}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 48, opacity: 0.4 }}>🪴</span>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f0ea', marginBottom: 6 }}>{p.name_ar}</h3>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    color: '#7a9480',
                    background: 'rgba(76,223,128,0.15)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    marginBottom: 10,
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
                <div style={{ fontSize: 14, fontWeight: 700, color: p.quantity > 0 ? '#4cdf80' : '#e05252' }}>
                  الكمية: {p.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
