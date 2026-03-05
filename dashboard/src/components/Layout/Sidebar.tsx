import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'الرئيسية' },
  { to: '/finance', label: 'المالية' },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: '260px',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #0d3b2c, #1a5c42)',
        borderLeft: '1px solid #2a3d2e',
      }}
    >
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>مليان </span>
        <span style={{ fontSize: '20px', fontWeight: 800, color: '#4cdf80' }}>للحدائق</span>
      </div>
      <nav style={{ padding: '12px' }}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 16px',
              borderRadius: '10px',
              color: isActive ? '#4cdf80' : 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: '4px',
              background: isActive ? 'rgba(76,223,128,0.15)' : 'transparent',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
