import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AddProductModal from './AddProductModal';

interface Product {
  id: string;
  name_ar: string;
  image_url: string | null;
  cost_price: number;
  sell_price: number;
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

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchProducts() {
    setLoading(true);
    const { data } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
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
                  شراء: <span style={{ color: '#e8f0ea' }}>{formatQAR(p.cost_price)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#7a9480', marginBottom: 4 }}>
                  بيع: <span style={{ color: '#4cdf80', fontWeight: 700 }}>{formatQAR(p.sell_price)}</span>
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
