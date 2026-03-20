import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function done() {
      if (!cancelled) setLoading(false);
    }

    // مهلة: إذا لم يُستجب خلال 6 ثوانٍ نوقف التحميل (تجنب البقاء على "جاري التحميل" للأبد)
    const timeoutId = setTimeout(done, 6000);

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
          clearTimeout(timeoutId);
          done();
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        done();
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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  // تسجيل خروج تلقائي بعد 24 ساعة خمول (عدم تفاعل)
  useEffect(() => {
    if (!user) return;

    const inactivityMs = 24 * 60 * 60 * 1000;
    const storageKey = 'malyan_lastActivity';
    let signedOut = false;

    const markActivity = () => {
      try {
        localStorage.setItem(storageKey, String(Date.now()));
      } catch {
        // تجاهل مشاكل التخزين (مثلاً في وضع الخصوصية)
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
        // تجاهل
      }
    }, 60 * 1000); // كل دقيقة

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
      clearInterval(intervalId);
    };
  }, [user]);

  return { user, role, loading, signOut };
}
