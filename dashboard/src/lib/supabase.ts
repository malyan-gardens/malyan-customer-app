import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** تشخيص آمن في التطوير فقط — لا يطبع المفتاح كاملاً */
if (import.meta.env.DEV) {
  try {
    const host = new URL(supabaseUrl).host;
    console.log('[supabase] init OK', {
      host,
      anonKeyLength: supabaseKey.length,
      anonKeySuffix: supabaseKey.slice(-6),
    });
  } catch {
    console.warn('[supabase] VITE_SUPABASE_URL غير صالح كـ URL');
  }
}
