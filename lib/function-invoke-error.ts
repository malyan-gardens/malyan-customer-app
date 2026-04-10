import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/functions-js";

/**
 * Human-readable hint when Edge Function invoke fails (deploy, network, Twilio, etc.).
 */
export function describeFunctionInvokeError(err: unknown): string {
  if (err instanceof FunctionsFetchError) {
    return "تعذّر الاتصال بدالة الحافة. تأكد من نشر الدالة (npm run supabase:deploy:otp) وبعد تسجيل الدخول: npx supabase login";
  }
  if (err instanceof FunctionsRelayError) {
    return "خادم الدوال لا يصل للدالة. انشر send-whatsapp-otp و verify-whatsapp-otp من لوحة Supabase أو عبر CLI.";
  }
  if (err instanceof FunctionsHttpError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "خطأ غير متوقع.";
}
