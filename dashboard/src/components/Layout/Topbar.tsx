import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function Topbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      const { data, error } = await supabase.from('notifications').select('id').eq('read', false);
      if (error) {
        setUnreadCount(0);
        return;
      }
      setUnreadCount((data ?? []).length);
    }
    fetchUnread();
  }, []);

  return (
    <header
      style={{
        height: '56px',
        borderBottom: '1px solid #2a3d2e',
        background: '#0f1a12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '13px', color: '#7a9480' }}>{user?.email}</span>
      <button
        type="button"
        onClick={() => navigate('/notifications')}
        style={{
          position: 'relative',
          background: 'transparent',
          border: '1px solid #2a3d2e',
          borderRadius: '8px',
          padding: '6px 12px',
          color: '#7a9480',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'Cairo, Tajawal, sans-serif',
          fontWeight: 900,
        }}
        aria-label="الإشعارات"
      >
        🔔
        {unreadCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              background: '#4cdf80',
              color: '#0a0a0a',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 900,
              padding: '2px 6px',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            {unreadCount}
          </span>
        ) : null}
      </button>
      <button
        onClick={() => signOut()}
        style={{
          background: 'transparent',
          border: '1px solid #2a3d2e',
          borderRadius: '8px',
          padding: '6px 14px',
          color: '#7a9480',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'Cairo, Tajawal, sans-serif',
        }}
      >
        خروج
      </button>
    </header>
  );
}
