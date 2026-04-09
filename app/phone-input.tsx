import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
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

type CountryCode = { label: string; dial: string };
const COUNTRY_CODES: CountryCode[] = [
  { label: "قطر", dial: "+974" },
  { label: "السعودية", dial: "+966" },
  { label: "الإمارات", dial: "+971" },
  { label: "الكويت", dial: "+965" },
];

const MAX_ATTEMPTS = 3;
const WINDOW_HOURS = 1;

function normalizePhone(raw: string, country: string) {
  const digits = raw.replace(/\D/g, "");
  const countryDigits = country.replace("+", "");
  const local = digits.startsWith(countryDigits) ? digits.slice(countryDigits.length) : digits;
  return `${country}${local}`;
}

function formatQatarPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("974")) digits = digits.slice(3);
  digits = digits.replace(/^0+/, "");
  const localDigits = digits.slice(0, 9);
  return `+974${localDigits}`;
}

async function checkAndIncrementRateLimit(phone: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data: row, error: readErr } = await supabase
    .from("otp_rate_limit")
    .select("id, attempts, window_start")
    .eq("phone_number", phone)
    .maybeSingle();

  if (readErr) return { allowed: true as const };

  if (!row) {
    await supabase.from("otp_rate_limit").insert({
      phone_number: phone,
      attempts: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true as const };
  }

  const inWindow = row.window_start && row.window_start >= windowStart;
  const attempts = Number(row.attempts ?? 0);

  if (inWindow && attempts >= MAX_ATTEMPTS) {
    return { allowed: false as const, message: "تم تجاوز الحد المسموح. حاول بعد ساعة." };
  }

  await supabase
    .from("otp_rate_limit")
    .update({
      attempts: inWindow ? attempts + 1 : 1,
      window_start: inWindow ? row.window_start : now.toISOString(),
    })
    .eq("id", row.id);

  return { allowed: true as const };
}

export default function PhoneInputScreen() {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [showCodes, setShowCodes] = useState(false);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    const fullPhoneNumber = formatQatarPhone(phoneLocal);
    if (!/^\+974\d{8,9}$/.test(fullPhoneNumber)) {
      setError("يرجى إدخال رقم صحيح بصيغة +974XXXXXXXXX");
      return;
    }

    setSending(true);
    try {
      const rate = await checkAndIncrementRateLimit(fullPhoneNumber);
      if (!rate.allowed) {
        setError(rate.message);
        return;
      }

      console.log("Sending OTP to:", fullPhoneNumber);
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhoneNumber });
      if (otpError) {
        console.log("OTP Error:", otpError);
        throw otpError;
      }
      console.log("OTP Success");
      router.push({ pathname: "/otp-verify", params: { phone: fullPhoneNumber } });
    } catch (e) {
      console.log("OTP Error:", e);
      setError(e instanceof Error ? e.message : "تعذر إرسال رمز التحقق.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "تسجيل برقم الهاتف" }} />
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.title}>أدخل رقم الهاتف</Text>
              <Text style={styles.sub}>سيتم إرسال رمز OTP عبر SMS</Text>

              <Text style={styles.label}>رمز الدولة</Text>
              <Pressable style={styles.codePicker} onPress={() => setShowCodes((v) => !v)}>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                <Text style={styles.codePickerText}>
                  {country.label} ({country.dial})
                </Text>
              </Pressable>
              {showCodes ? (
                <View style={styles.codesMenu}>
                  {COUNTRY_CODES.map((c) => (
                    <Pressable
                      key={c.dial}
                      style={styles.codeRow}
                      onPress={() => {
                        setCountry(c);
                        setShowCodes(false);
                      }}
                    >
                      <Text style={styles.codeRowText}>
                        {c.label} ({c.dial})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.label}>رقم الجوال</Text>
              <TextInput
                value={phoneLocal}
                onChangeText={(t) => setPhoneLocal(t.replace(/[^\d]/g, "").slice(0, 15))}
                placeholder="XXXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Pressable
                style={[styles.btn, sending && styles.btnDisabled]}
                onPress={() => void sendOtp()}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>إرسال OTP</Text>
                )}
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </ScrollView>
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
  label: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 6,
    fontFamily: font,
    fontWeight: "600",
  },
  codePicker: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codePickerText: { color: "#fff", fontFamily: font, fontWeight: "700" },
  codesMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  codeRow: { backgroundColor: colors.bgElevated, padding: 12 },
  codeRowText: { color: "#fff", textAlign: "right", fontFamily: font },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlign: "right",
    marginBottom: spacing.lg,
    fontFamily: font,
    fontSize: 17,
  },
  btn: {
    backgroundColor: "#1a7a3c",
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.85 },
  btnText: { color: "#fff", fontWeight: "800", fontFamily: font, fontSize: 16 },
  error: { color: colors.red400, textAlign: "center", marginTop: 10, fontFamily: font },
});
