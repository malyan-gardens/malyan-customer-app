import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const links = [
  { to: '/dashboard',     label: '🏠 الرئيسية' },
  { to: '/orders',        label: '📦 الطلبات' },
  { to: '/inventory',     label: '🌿 المخزون' },
  { to: '/customers',     label: '👥 العملاء' },
  { to: '/maintenance',   label: '🔧 الصيانة' },
  { to: '/design',        label: '🎨 التصميم' },
  { to: '/promotions',    label: '🎁 العروض' },
  { to: '/finance',       label: '💰 المالية' },
  { to: '/notifications', label: '🔔 الإشعارات' },
  { to: '/ai',            label: '🤖 مليان الذكي' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }
  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      background: 'linear-gradient(180deg, #0d3b2c, #1a5c42)',
      borderLeft: '1px solid #2a3d2e',
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>مليان </span>
        <span style={{ fontSize: '20px', fontWeight: 800, color: '#4cdf80' }}>للحدائق</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 69px)' }}>
        <nav style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 14px',
                borderRadius: '10px',
                color: isActive ? '#4cdf80' : 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: '2px',
                fontSize: '14px',
                background: isActive ? 'rgba(76,223,128,0.15)' : 'transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(224,82,82,0.35)',
              color: '#e05252',
              background: 'rgba(224,82,82,0.08)',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Cairo, Tajawal, sans-serif',
              fontSize: '14px',
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>
  );
}