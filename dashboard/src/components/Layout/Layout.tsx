import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080e0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Cairo, Tajawal, sans-serif',
        direction: 'rtl',
      }}
    >
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
