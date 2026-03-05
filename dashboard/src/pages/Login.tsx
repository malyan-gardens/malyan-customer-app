import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@malyangardens.com')) {
      setError('يجب أن يكون الإيميل من نطاق @malyangardens.com');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError('بيانات غير صحيحة، حاول مجدداً');
    else navigate('/dashboard');
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080e0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, Tajawal, sans-serif', direction: 'rtl' }}>
      <div style={{ background: '#0f1a12', border: '1px solid #2a3d2e', borderRadius: 16, padding: 48, width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #1a7a3c, #4cdf80)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, boxShadow: '0 8px 24px rgba(26,122,60,0.4)' }}>🌿</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#e8f0ea' }}>مليان للتجارة والحدائق</h1>
        <p style={{ color: '#7a9480', fontSize: 13, marginBottom: 32 }}>لوحة إدارة الشركة</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7a9480', marginBottom: 6 }}>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="zaher@malyangardens.com" required style={{ width: '100%', background: '#080e0a', border: '1px solid #2a3d2e', borderRadius: 10, padding: '12px 16px', color: '#e8f0ea', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7a9480', marginBottom: 6 }}>كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', background: '#080e0a', border: '1px solid #2a3d2e', borderRadius: 10, padding: '12px 16px', color: '#e8f0ea', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 8, padding: 10, color: '#e05252', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? '#1a3d24' : 'linear-gradient(135deg, #1a7a3c, #22a84f)', border: 'none', borderRadius: 10, padding: 14, color: 'white', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(26,122,60,0.4)' }}>{loading ? '⏳ جاري الدخول...' : 'دخول إلى النظام'}</button>
        </form>
        <p style={{ marginTop: 16, fontSize: 11, color: '#4a6450' }}>الدخول مخصص لفريق مليان فقط</p>
      </div>
    </div>
  );
}
