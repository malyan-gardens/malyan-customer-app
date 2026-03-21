import { createClient } from '@supabase/supabase-js';

/**
 * يجب تعيينها في Vercel / ملف .env داخل مجلد dashboard:
 * - VITE_SUPABASE_URL=https://xxxx.supabase.co
 * - VITE_SUPABASE_ANON_KEY=eyJ... (مفتاح anon من إعدادات المشروع)
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** تشخيص آمن — لا يطبع المفتاح كاملاً */
try {
  const host = new URL(supabaseUrl).host;
  console.log('[supabase] client ready', {
    host,
    anonKeySet: supabaseKey.length > 20,
    anonKeyLength: supabaseKey.length,
    anonKeySuffix: supabaseKey.slice(-6),
  });
} catch {
  console.warn('[supabase] VITE_SUPABASE_URL غير صالح كـ URL');
}
