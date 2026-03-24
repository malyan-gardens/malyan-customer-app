import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1) كل تحميل صفحة: افحص وجود جلسة محفوظة في localStorage
    try {
      const storageKeys = Object.keys(localStorage);
      const hasStoredSession = storageKeys.some((k) => k.includes('auth-token'));
      console.log('[auth] localStorage session key exists:', hasStoredSession);
    } catch {
      // ignore storage errors
    }

    // 2) دائماً: التحقق من الجلسة الفعلية من Supabase قبل أي توجيه
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            if (!cancelled) setRole(data?.role ?? '');
          } catch {
            if (!cancelled) setRole('');
          }
        } else {
          setRole('');
        }
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    // 3) الاستماع لتغييرات الجلسة (تسجيل دخول/خروج، Magic Link، إلخ)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          setRole(data?.role ?? '');
        } catch {
          setRole('');
        }
      } else {
        setRole('');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, role, loading, signOut };
}
