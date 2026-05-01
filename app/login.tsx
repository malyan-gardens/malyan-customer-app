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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../lib/authStore";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oauthRedirectWeb = "https://malyan-customer-app.vercel.app/auth/callback";
  const oauthRedirectNative = makeRedirectUri({ path: "auth/callback" });

  const googleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      const redirectTo = Platform.OS === "web" ? oauthRedirectWeb : oauthRedirectNative;

      if (Platform.OS === "web") {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (oauthError) throw oauthError;
        return;
      }

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success") {
          router.replace("/auth/callback");
          return;
        }
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
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
                onPress={() => void googleLogin()}
                style={({ pressed }) => [styles.btn, styles.btnGoogle, pressed && styles.pressed]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Ionicons name="logo-google" size={22} color="#DB4437" />
                )}
                <Text style={styles.btnGoogleText}>تسجيل بجوجل</Text>
              </Pressable>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <Pressable
              onPress={() => {
                useAuthStore.getState().setState({ session: null, isGuest: true });
                router.replace("/(tabs)/home");
              }}
              style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.guestBtnText}>تصفح كضيف</Text>
            </Pressable>
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
  btnGoogleText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  pressed: { opacity: 0.88 },
  errorText: {
    color: colors.red400,
    textAlign: "center",
    marginTop: 8,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  guestBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  guestBtnText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
});