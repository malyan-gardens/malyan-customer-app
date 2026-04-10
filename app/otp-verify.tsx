import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { describeFunctionInvokeError } from "../lib/function-invoke-error";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

export default function OtpVerifyScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const phoneValue = useMemo(() => String(phone ?? ""), [phone]);
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    otpRef.current?.focus();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const verify = async () => {
    setError(null);
    if (!phoneValue) {
      setError("رقم الهاتف غير موجود. يرجى إعادة المحاولة.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("يرجى إدخال رمز مكوّن من 6 أرقام.");
      return;
    }
    setVerifying(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "verify-whatsapp-otp",
        { body: { phone: phoneValue, code: otp } }
      );
      if (fnError) throw new Error(describeFunctionInvokeError(fnError));
      const payload = data as {
        ok?: boolean;
        error?: string;
        session?: { access_token: string; refresh_token: string };
      } | null;
      if (!payload?.ok || !payload.session) {
        throw new Error(payload?.error ?? "فشل التحقق من الرمز.");
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (sessionError) throw sessionError;
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحقق من الرمز.");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (seconds > 0 || !phoneValue) return;
    setResending(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "send-whatsapp-otp",
        { body: { phone: phoneValue } }
      );
      if (fnError) throw new Error(describeFunctionInvokeError(fnError));
      const payload = data as { ok?: boolean; error?: string } | null;
      if (!payload?.ok) {
        throw new Error(payload?.error ?? "تعذر إعادة إرسال الرمز.");
      }
      setSeconds(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إعادة إرسال الرمز.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "تأكيد OTP" }} />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.wrap}>
            <View style={styles.card}>
              <Text style={styles.title}>أدخل رمز التحقق</Text>
              <Text style={styles.sub}>تم إرسال الرمز عبر واتساب إلى: {phoneValue}</Text>

              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
              />

              <Pressable
                style={[styles.btn, verifying && styles.btnDisabled]}
                onPress={() => void verify()}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>تحقق</Text>
                )}
              </Pressable>

              <Text style={styles.timer}>
                {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : "يمكنك إعادة إرسال الرمز الآن"}
              </Text>

              <Pressable
                style={[styles.linkBtn, (seconds > 0 || resending) && styles.linkBtnDisabled]}
                disabled={seconds > 0 || resending}
                onPress={() => void resend()}
              >
                {resending ? (
                  <ActivityIndicator color="#1a7a3c" />
                ) : (
                  <Text style={styles.linkText}>إعادة إرسال OTP</Text>
                )}
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const font = Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080e0a" },
  flex: { flex: 1 },
  wrap: { padding: spacing.lg, paddingTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "right", fontFamily: font },
  sub: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 8,
    marginBottom: spacing.lg,
    fontFamily: font,
  },
  otpInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: "#fff",
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 8,
    paddingVertical: 14,
    marginBottom: spacing.md,
    fontFamily: font,
  },
  btn: {
    backgroundColor: "#1a7a3c",
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.85 },
  btnText: { color: "#fff", fontWeight: "800", fontFamily: font, fontSize: 16 },
  timer: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: font,
  },
  linkBtn: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a7a3c",
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  linkBtnDisabled: { opacity: 0.5 },
  linkText: { color: "#1a7a3c", fontFamily: font, fontWeight: "800" },
  error: { color: colors.red400, textAlign: "center", marginTop: 10, fontFamily: font },
});
