import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        try {
          if (session?.user) {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            if (!cancelled) setRole(data?.role ?? '');
          }
        } catch {
          // تجاهل خطأ profiles (جدول أو RLS)
        } finally {
          if (!cancelled) setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

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
