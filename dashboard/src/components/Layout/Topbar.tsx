import { useAuth } from '../../hooks/useAuth';

export default function Topbar() {
  const { user, signOut } = useAuth();

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
