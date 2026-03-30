import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

const styles = {
  page: { padding: 28, direction: 'rtl' as const, fontFamily: 'Cairo, Tajawal, sans-serif', color: '#e8f0ea', background: '#080e0a', minHeight: '100vh' },
  box: { background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 14 },
};

type NotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const days = Math.floor(h / 24);
  return `منذ ${days} يوم`;
}

function typeBadge(type: string | null) {
  const t = type || 'info';
  if (t === 'order') return { icon: '📦', label: 'طلب' };
  if (t === 'maintenance') return { icon: '🔧', label: 'صيانة' };
  if (t === 'design') return { icon: '🎨', label: 'تصميم' };
  if (t === 'stock') return { icon: '⚠️', label: 'مخزون' };
  return { icon: 'ℹ️', label: 'معلومة' };
}

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    console.log('[notifications] fetch', { data, error });
    if (error) {
      setError(error.message);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems((data as NotificationRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    fetchNotifications();
  }

  async function markAllRead() {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
    if (error) alert(error.message);
    fetchNotifications();
  }

  async function deleteNotification(id: string) {
    const ok = window.confirm('هل أنت متأكد من حذف الإشعار؟');
    if (!ok) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) alert(error.message);
    fetchNotifications();
  }

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 14, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🔔 الإشعارات</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={markAllRead}
            style={{ background: 'transparent', border: '1px solid #2a3d2e', borderRadius: 10, padding: '10px 16px', color: '#7a9480', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}
          >
            تحديد الكل كمقروء
          </button>
          <div style={{ background: 'rgba(76,223,128,0.12)', border: '1px solid rgba(76,223,128,0.25)', padding: '6px 12px', borderRadius: 999, color: '#4cdf80', fontWeight: 900, fontSize: 12 }}>
            غير مقروء: {unreadCount}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ ...styles.box, padding: 40, textAlign: 'center', color: '#4a6450' }}>⏳ جاري التحميل...</div>
      ) : error ? (
        <div style={{ ...styles.box, padding: 16, color: '#ef4444' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.length === 0 ? (
            <div style={{ ...styles.box, padding: 60, textAlign: 'center', color: '#4a6450' }}>لا توجد إشعارات</div>
          ) : (
            items.map((n) => {
              const badge = typeBadge(n.type);
              const highlight = !n.read;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markRead(n.id)}
                  style={{
                    ...styles.box,
                    padding: 16,
                    cursor: 'pointer',
                    background: highlight ? 'rgba(76,223,128,0.08)' : '#0f1a12',
                    borderColor: highlight ? 'rgba(76,223,128,0.35)' : '#2a3d2e',
                    borderLeft: highlight ? '4px solid #4cdf80' : undefined,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ background: 'rgba(76,223,128,0.12)', border: '1px solid rgba(76,223,128,0.25)', color: '#4cdf80', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
                        {badge.icon} {badge.label}
                      </span>
                      <div style={{ fontWeight: 900 }}>{n.title || '—'}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#7a9480', whiteSpace: 'pre-line' }}>{n.message || ''}</div>
                    <div style={{ fontSize: 11, color: '#7a9480', marginTop: 8 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    style={{ background: 'transparent', border: '1px solid rgba(224,82,82,0.35)', color: '#e05252', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900 }}
                  >
                    حذف
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

