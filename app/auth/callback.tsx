import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { colors } from "../../lib/theme";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        // Supabase web client may need a brief moment to finalize URL session parsing.
        for (let i = 0; i < 8; i += 1) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            if (mounted) router.replace("/(tabs)/home");
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        if (mounted) router.replace("/login");
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "تعذر إكمال تسجيل الدخول.");
          setTimeout(() => router.replace("/login"), 1200);
        }
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.title}>جاري إكمال تسجيل الدخول…</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  title: { color: colors.white, marginTop: 14, fontSize: 16, textAlign: "center" },
  error: { color: colors.red400, marginTop: 8, textAlign: "center" },
});
