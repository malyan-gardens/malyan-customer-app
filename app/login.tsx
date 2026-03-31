import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phone, setPhone] = useState("+974");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [providerLoading, setProviderLoading] = useState<null | "google" | "apple">(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const redirectTo = makeRedirectUri({ path: "login" });

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const withCountry = digits.startsWith("974") ? digits : `974${digits}`;
    return `+${withCountry.slice(0, 11)}`;
  };

  const oauthLogin = async (provider: "google" | "apple") => {
    try {
      setError(null);
      setProviderLoading(provider);

      if (Platform.OS === "web") {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (oauthError) throw oauthError;
        return;
      }

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;

      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول.");
    } finally {
      setProviderLoading(null);
    }
  };

  const submitPhone = async () => {
    try {
      setError(null);
      const normalized = normalizePhone(phone);
      if (!/^\+974\d{8}$/.test(normalized)) {
        setError("يرجى إدخال رقم صحيح بصيغة +974XXXXXXXX");
        return;
      }
      setSendingOtp(true);
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (otpError) throw otpError;
      setPhone(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إرسال رمز OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const submitOtp = async () => {
    try {
      setError(null);
      if (!/^\d{6}$/.test(otp)) {
        setError("يرجى إدخال رمز مكوّن من 6 أرقام.");
        return;
      }
      setVerifyingOtp(true);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalizePhone(phone),
        token: otp,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحقق من الرمز.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoBlock}>
              <Ionicons name="leaf" size={46} color="#1a7a3c" />
              <Text style={styles.brand}>مليان للحدائق</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>تسجيل الدخول</Text>
              <Pressable
                onPress={() => void oauthLogin("google")}
                style={({ pressed }) => [styles.btn, styles.btnGoogle, pressed && styles.pressed]}
                disabled={providerLoading !== null}
              >
                {providerLoading === "google" ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Ionicons name="logo-google" size={22} color="#DB4437" />
                )}
                <Text style={styles.btnGoogleText}>تسجيل بجوجل</Text>
              </Pressable>
              <Pressable
                onPress={() => void oauthLogin("apple")}
                style={({ pressed }) => [styles.btn, styles.btnApple, pressed && styles.pressed]}
                disabled={providerLoading !== null}
              >
                {providerLoading === "apple" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="logo-apple" size={24} color="#fff" />
                )}
                <Text style={styles.btnText}>تسجيل بـ Apple</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowPhoneOtp((v) => !v)}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnWhatsapp,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                <Text style={styles.btnText}>تسجيل برقم الواتساب</Text>
              </Pressable>

              {showPhoneOtp ? (
                <>
                  <Text style={styles.hint}>أدخل رقم الجوال: +974XXXXXXXX</Text>
                  <View style={styles.phoneRow}>
                    <TextInput
                      value={phone}
                      onChangeText={(t) => setPhone(normalizePhone(t))}
                      placeholder="+974XXXXXXXX"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      style={styles.input}
                      maxLength={12}
                      textAlign="left"
                    />
                  </View>
                  <Pressable
                    onPress={() => void submitPhone()}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnWhatsapp,
                      pressed && styles.pressed,
                    ]}
                    disabled={sendingOtp || verifyingOtp}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnText}>إرسال رمز OTP</Text>
                    )}
                  </Pressable>
                  <Text style={styles.hint}>أدخل رمز التحقق (6 أرقام)</Text>
                  <TextInput
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.inputOtp}
                    maxLength={6}
                  />
                  <Pressable
                    onPress={() => void submitOtp()}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnWhatsapp,
                      pressed && styles.pressed,
                    ]}
                    disabled={sendingOtp || verifyingOtp}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnText}>تأكيد الرمز</Text>
                    )}
                  </Pressable>
                </>
              ) : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0a0a0a" },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoBlock: { alignItems: "center", marginBottom: spacing.xl },
  brand: {
    color: "#1a7a3c",
    fontSize: 30,
    fontWeight: "800",
    marginTop: spacing.md,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: spacing.md,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "right",
    marginBottom: spacing.sm,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: radii.md,
    marginBottom: 12,
  },
  btnGoogle: { backgroundColor: "#ffffff" },
  btnApple: { backgroundColor: "#000000" },
  btnWhatsapp: { backgroundColor: "#25D366" },
  btnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  btnGoogleText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  pressed: { opacity: 0.88 },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.md,
  },
  prefix: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 18,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  inputOtp: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: spacing.md,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  errorText: {
    color: colors.red400,
    textAlign: "center",
    marginTop: 8,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
});
