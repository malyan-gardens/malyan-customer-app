import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1) دائماً: التحقق من الجلسة المحفوظة أولاً قبل أي توجيه
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

    // 2) الاستماع لتغييرات الجلسة (تسجيل دخول/خروج، Magic Link، إلخ)
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

  // تسجيل خروج تلقائي بعد 24 ساعة خمول
  useEffect(() => {
    if (!user) return;

    const inactivityMs = 24 * 60 * 60 * 1000;
    const storageKey = 'malyan_lastActivity';
    let signedOut = false;

    const markActivity = () => {
      try {
        localStorage.setItem(storageKey, String(Date.now()));
      } catch {
        // ignore
      }
    };

    markActivity();

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, markActivity));

    const intervalId = window.setInterval(() => {
      try {
        const last = Number(localStorage.getItem(storageKey) || '0');
        if (!signedOut && last > 0 && Date.now() - last > inactivityMs) {
          signedOut = true;
          signOut();
        }
      } catch {
        // ignore
      }
    }, 60 * 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
      clearInterval(intervalId);
    };
  }, [user]);

  return { user, role, loading, signOut };
}
