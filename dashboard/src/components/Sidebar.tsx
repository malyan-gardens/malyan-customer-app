import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'الرئيسية' },
  { to: '/orders', label: 'الطلبات' },
  { to: '/projects', label: 'المشاريع' },
  { to: '/team', label: 'الفريق' },
  { to: '/inventory', label: 'المخزون' },
  { to: '/finance', label: 'المالية' },
  { to: '/settings', label: 'الإعدادات' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-green-deep to-green-mid text-white">
      <div className="border-b border-white/20 p-4">
        <span className="text-xl font-extrabold">مليان </span>
        <span className="text-xl font-extrabold text-gold">للحدائق</span>
      </div>
      <nav className="p-2">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 font-medium transition-colors ${
                isActive ? 'bg-white/10 text-gold' : 'text-white/90 hover:bg-white/5 hover:text-gold'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
