import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function requireMalyanEmail(email: string) {
  if (!email.endsWith('@malyangardens.com')) {
    throw new Error('يجب أن يكون الإيميل من نطاق @malyangardens.com');
  }
}

export function useAuth() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!hasUrl) {
      const demoUser = localStorage.getItem('malyan_demo_user');
      setUser(demoUser ? { email: 'demo@malyangardens.com' } : null);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
