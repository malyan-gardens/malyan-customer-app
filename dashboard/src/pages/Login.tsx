import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requireMalyanEmail } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      requireMalyanEmail(email);
      if (hasSupabase) {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        localStorage.setItem('malyan_demo_user', '1');
      }
      navigate('/dashboard', { replace: true });
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-deep p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-extrabold text-green-deep">مليان <span className="text-gold">للحدائق</span></h1>
        <p className="mb-6 text-gray-500">لوحة التحكم — تسجيل الدخول</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@malyangardens.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right focus:border-green-mid focus:outline-none focus:ring-1 focus:ring-green-mid"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-right focus:border-green-mid focus:outline-none focus:ring-1 focus:ring-green-mid"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!hasSupabase && (
            <p className="text-sm text-amber-700">وضع تجريبي: أي إيميل @malyangardens.com يقبل.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-gold py-3 font-bold text-green-deep transition hover:bg-amber-600"
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
