import { useEffect, useState } from 'react';
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
      <div style={{ background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 880, maxHeight: '90vh', overflow: 'auto' }}>
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

type PromotionRow = {
  id: string;
  title: string;
  description: string | null;
  discount_type: string | null;
  discount_value: number | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean | null;
  created_at: string;
};

type BannerRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  link: string | null;
  position: string | null;
  active: boolean | null;
  created_at: string;
};

async function uploadImage(file: File | null): Promise<{ url: string | null; warn: string | null }> {
  if (!file) return { url: null, warn: null };
  const fileName = `${Date.now()}-${file.name}`;
  console.log('[promotions] upload start', { bucket: 'inventory-images', fileName });

  const uploadPromise = supabase.storage.from('inventory-images').upload(fileName, file, { upsert: true });
  const timeoutPromise = new Promise<any>((resolve) =>
    setTimeout(() => resolve({ data: null, error: { message: 'انتهت مهلة رفع الصورة' } }), 8000)
  );

  const result = await Promise.race([uploadPromise, timeoutPromise]);
  console.log('[promotions] upload result', result);
  if (result?.error) {
    return { url: null, warn: 'تم الحفظ بدون صورة' };
  }

  const uploadData = result.data;
  const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(uploadData.path);
  return { url: urlData.publicUrl ?? null, warn: null };
}

export default function Promotions() {
  const [tab, setTab] = useState<'offers' | 'ads'>('offers');
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: '',
    active: true,
  });
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);

  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    link: '',
    position: 'home',
    active: true,
  });
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const [pRes, bRes] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('banners').select('*').order('created_at', { ascending: false }),
    ]);
    if (pRes.error || bRes.error) {
      setError((pRes.error ?? bRes.error)?.message || 'فشل جلب العروض/الإعلانات');
      setPromotions([]);
      setBanners([]);
      setLoading(false);
      return;
    }
    setPromotions((pRes.data as PromotionRow[]) ?? []);
    setBanners((bRes.data as BannerRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDiscount = (p: PromotionRow) => {
    if (!p.discount_value) return '—';
    const t = p.discount_type || 'percent';
    if (t === 'qar') return `${p.discount_value} QAR`;
    return `${p.discount_value}%`;
  };

  async function addPromotion() {
    const { url, warn } = await uploadImage(promoImageFile);
    const payload = {
      title: promoForm.title.trim(),
      description: promoForm.description.trim(),
      discount_type: promoForm.discount_type,
      discount_value: Number(promoForm.discount_value) || 0,
      start_date: promoForm.start_date || null,
      end_date: promoForm.end_date || null,
      image_url: url,
      active: promoForm.active,
    };
    const { error } = await supabase.from('promotions').insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    if (warn) alert(warn);
    setShowPromoModal(false);
    setPromoForm({ title: '', description: '', discount_type: 'percent', discount_value: '', start_date: '', end_date: '', active: true });
    setPromoImageFile(null);
    refresh();
  }

  async function addBanner() {
    const { url, warn } = await uploadImage(bannerImageFile);
    const payload = {
      title: bannerForm.title.trim(),
      link: bannerForm.link.trim() || null,
      position: bannerForm.position,
      image_url: url,
      active: bannerForm.active,
    };
    const { error } = await supabase.from('banners').insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    if (warn) alert(warn);
    setShowBannerModal(false);
    setBannerForm({ title: '', link: '', position: 'home', active: true });
    setBannerImageFile(null);
    refresh();
  }

  async function togglePromotion(id: string, active: boolean) {
    const { error } = await supabase.from('promotions').update({ active }).eq('id', id);
    if (error) alert(error.message);
    refresh();
  }

  async function toggleBanner(id: string, active: boolean) {
    const { error } = await supabase.from('banners').update({ active }).eq('id', id);
    if (error) alert(error.message);
    refresh();
  }

  async function deletePromotion(id: string) {
    const ok = window.confirm('هل أنت متأكد من حذف العرض؟');
    if (!ok) return;
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) alert(error.message);
    refresh();
  }

  async function deleteBanner(id: string) {
    const ok = window.confirm('هل أنت متأكد من حذف الإعلان؟');
    if (!ok) return;
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) alert(error.message);
    refresh();
  }

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 14, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🎁 العروض والإعلانات</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setTab('offers')} style={{ background: tab === 'offers' ? '#1a7a3c' : '#080e0a', border: '1px solid #2a3d2e', color: tab === 'offers' ? 'white' : '#7a9480', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            العروض
          </button>
          <button type="button" onClick={() => setTab('ads')} style={{ background: tab === 'ads' ? '#1a7a3c' : '#080e0a', border: '1px solid #2a3d2e', color: tab === 'ads' ? 'white' : '#7a9480', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            الإعلانات
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...styles.box, padding: 40, textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
      ) : error ? (
        <div style={{ ...styles.box, padding: 16, color: '#ef4444', marginBottom: 16 }}>{error}</div>
      ) : tab === 'offers' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button type="button" onClick={() => setShowPromoModal(true)} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', borderRadius: 10, padding: '10px 18px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
              + إضافة عرض
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {promotions.map((p) => (
              <div key={p.id} style={{ ...styles.box, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: '#7a9480' }}>{formatDiscount(p)}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>
                      من {p.start_date || '—'} إلى {p.end_date || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 10, whiteSpace: 'pre-line' }}>{p.description}</div>
                  </div>
                  <div style={{ width: 86, height: 86, borderRadius: 12, overflow: 'hidden', border: '1px solid #2a3d2e', background: '#111827', flexShrink: 0 }}>
                    {p.image_url ? (
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
                  <button type="button" onClick={() => togglePromotion(p.id, !p.active)} style={{ background: p.active ? '#1a7a3c' : '#080e0a', border: '1px solid #2a3d2e', color: p.active ? 'white' : '#7a9480', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
                    {p.active ? 'نشط' : 'غير نشط'}
                  </button>
                  <button type="button" onClick={() => deletePromotion(p.id)} style={{ background: 'transparent', border: '1px solid rgba(224,82,82,0.35)', color: '#e05252', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {promotions.length === 0 ? <div style={{ ...styles.box, padding: 60, textAlign: 'center', color: '#4a6450' }}>لا توجد عروض</div> : null}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button type="button" onClick={() => setShowBannerModal(true)} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', borderRadius: 10, padding: '10px 18px', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
              + إضافة إعلان
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {banners.map((b) => (
              <div key={b.id} style={{ ...styles.box, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{b.title || '—'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480' }}>الموضع: {b.position || 'home'}</div>
                    <div style={{ fontSize: 12, color: '#7a9480', marginTop: 6 }}>الرابط: {b.link || '—'}</div>
                  </div>
                  <div style={{ width: 86, height: 86, borderRadius: 12, overflow: 'hidden', border: '1px solid #2a3d2e', background: '#111827', flexShrink: 0 }}>
                    {b.image_url ? (
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      <img src={b.image_url} alt={b.title || 'banner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
                  <button type="button" onClick={() => toggleBanner(b.id, !b.active)} style={{ background: b.active ? '#1a7a3c' : '#080e0a', border: '1px solid #2a3d2e', color: b.active ? 'white' : '#7a9480', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
                    {b.active ? 'نشط' : 'غير نشط'}
                  </button>
                  <button type="button" onClick={() => deleteBanner(b.id)} style={{ background: 'transparent', border: '1px solid rgba(224,82,82,0.35)', color: '#e05252', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {banners.length === 0 ? <div style={{ ...styles.box, padding: 60, textAlign: 'center', color: '#4a6450' }}>لا توجد إعلانات</div> : null}
          </div>
        </div>
      )}

      {/* Promo Modal */}
      <Modal open={showPromoModal} title="إضافة عرض" onClose={() => setShowPromoModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>العنوان</label>
            <input style={styles.input} value={promoForm.title} onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>الوصف</label>
            <textarea style={{ ...styles.input, minHeight: 90 }} value={promoForm.description} onChange={(e) => setPromoForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>نوع الخصم</label>
            <select style={styles.input} value={promoForm.discount_type} onChange={(e) => setPromoForm((f) => ({ ...f, discount_type: e.target.value }))}>
              <option value="percent">%</option>
              <option value="qar">QAR</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>قيمة الخصم</label>
            <input style={styles.input} type="number" value={promoForm.discount_value} onChange={(e) => setPromoForm((f) => ({ ...f, discount_value: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>تاريخ البدء</label>
            <input style={styles.input} value={promoForm.start_date} onChange={(e) => setPromoForm((f) => ({ ...f, start_date: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label style={styles.label}>تاريخ الانتهاء</label>
            <input style={styles.input} value={promoForm.end_date} onChange={(e) => setPromoForm((f) => ({ ...f, end_date: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label style={styles.label}>الصورة</label>
            <input type="file" accept="image/*" onChange={(e) => setPromoImageFile(e.target.files?.[0] ?? null)} style={{ color: '#e8f0ea' }} />
          </div>
          <div>
            <label style={styles.label}>الحالة</label>
            <button type="button" onClick={() => setPromoForm((f) => ({ ...f, active: !f.active }))} style={{ ...styles.input, cursor: 'pointer', display: 'block', padding: '10px 14px', textAlign: 'right' as any, background: promoForm.active ? '#1a7a3c' : '#080e0a', borderColor: '#2a3d2e', color: 'white' }}>
              {promoForm.active ? 'نشط' : 'غير نشط'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => setShowPromoModal(false)} style={{ background: 'transparent', border: '1px solid #2a3d2e', color: '#7a9480', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            إلغاء
          </button>
          <button type="button" onClick={addPromotion} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', color: 'white', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            حفظ
          </button>
        </div>
      </Modal>

      {/* Banner Modal */}
      <Modal open={showBannerModal} title="إضافة إعلان" onClose={() => setShowBannerModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>العنوان</label>
            <input style={styles.input} value={bannerForm.title} onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>الموضع</label>
            <select style={styles.input} value={bannerForm.position} onChange={(e) => setBannerForm((f) => ({ ...f, position: e.target.value }))}>
              <option value="home">home</option>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>الرابط (اختياري)</label>
            <input style={styles.input} value={bannerForm.link} onChange={(e) => setBannerForm((f) => ({ ...f, link: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>الصورة</label>
            <input type="file" accept="image/*" onChange={(e) => setBannerImageFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label style={styles.label}>الحالة</label>
            <button type="button" onClick={() => setBannerForm((f) => ({ ...f, active: !f.active }))} style={{ ...styles.input, cursor: 'pointer', display: 'block', padding: '10px 14px', textAlign: 'right' as any, background: bannerForm.active ? '#1a7a3c' : '#080e0a', borderColor: '#2a3d2e', color: 'white' }}>
              {bannerForm.active ? 'نشط' : 'غير نشط'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => setShowBannerModal(false)} style={{ background: 'transparent', border: '1px solid #2a3d2e', color: '#7a9480', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            إلغاء
          </button>
          <button type="button" onClick={addBanner} style={{ background: 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', color: 'white', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}>
            حفظ
          </button>
        </div>
      </Modal>
    </div>
  );
}

