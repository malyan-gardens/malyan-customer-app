import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { MalyanLogo } from "../components/MalyanLogo";
import { setSession } from "../lib/authStorage";
import { colors, radii, shadows, spacing } from "../lib/theme";

type Step = "choose" | "phone" | "otp";

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const goHome = async () => {
    await setSession(true);
    router.replace("/(tabs)/home");
  };

  const normalizeQatar = (raw: string) => raw.replace(/\D/g, "").slice(0, 8);

  const submitPhone = () => {
    if (normalizeQatar(phone).length >= 8) setStep("otp");
  };

  const submitOtp = () => {
    if (otp.length >= 4) void goHome();
  };

  return (
    <LinearGradient
      colors={[colors.bg, "#0f1f14", colors.bg]}
      style={styles.gradient}
    >
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
              <MalyanLogo size="md" />
              <Text style={styles.welcome}>مرحباً بك في ماليان</Text>
            </View>

            {step === "choose" && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>تسجيل الدخول</Text>
                <Pressable
                  onPress={() => void goHome()}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnGoogle,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="logo-google" size={22} color="#fff" />
                  <Text style={styles.btnText}>تسجيل الدخول بـ Google</Text>
                </Pressable>
                <Pressable
                  onPress={() => void goHome()}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnApple,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="logo-apple" size={24} color="#fff" />
                  <Text style={styles.btnText}>تسجيل الدخول بـ Apple</Text>
                </Pressable>
                <Pressable
                  onPress={() => setStep("phone")}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnBrand,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="call-outline" size={22} color="#fff" />
                  <Text style={styles.btnText}>تسجيل الدخول برقم الهاتف</Text>
                </Pressable>
              </View>
            )}

            {step === "phone" && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>رقم الهاتف في قطر</Text>
                <Text style={styles.hint}>أدخل الرقم بدون +974</Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.prefix}>+974</Text>
                  <TextInput
                    value={phone}
                    onChangeText={(t) => setPhone(normalizeQatar(t))}
                    placeholder="XXXXXXXX"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    style={styles.input}
                    maxLength={8}
                  />
                </View>
                <Pressable
                  onPress={submitPhone}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnBrand,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnText}>إرسال رمز التحقق</Text>
                </Pressable>
                <Pressable onPress={() => setStep("choose")}>
                  <Text style={styles.link}>رجوع</Text>
                </Pressable>
              </View>
            )}

            {step === "otp" && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>رمز التحقق</Text>
                <Text style={styles.hint}>أدخل الرمز المرسل إلى هاتفك</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.inputOtp}
                  maxLength={6}
                />
                <Pressable
                  onPress={submitOtp}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnBrand,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnText}>تأكيد</Text>
                </Pressable>
                <Pressable onPress={() => setStep("phone")}>
                  <Text style={styles.link}>تعديل الرقم</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoBlock: { alignItems: "center", marginBottom: spacing.xl },
  welcome: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: "600",
    marginTop: spacing.md,
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
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "right",
    marginBottom: spacing.sm,
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
  btnGoogle: { backgroundColor: colors.googleRed },
  btnApple: {
    backgroundColor: colors.appleBlack,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  btnBrand: { backgroundColor: colors.brand },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
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
    textAlign: "right",
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
  },
  link: {
    color: colors.gold,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
});
