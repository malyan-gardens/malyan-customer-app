import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MalyanLogo } from "../components/MalyanLogo";
import { supabase } from "../lib/supabase";
import { colors } from "../lib/theme";

export default function SplashScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/(tabs)/home");
      else router.replace("/login");
    }, 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <LinearGradient
      colors={["#0d3d22", colors.brand, "#063015"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.screen}
    >
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <MalyanLogo size="lg" />
        <Text style={styles.tagline}>منتجات فاخرة في قطر — مليان للحدائق</Text>
      </Animated.View>
      <View style={styles.footer}>
        <Text style={styles.footerHint}>جاري التحميل…</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  tagline: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 28,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
  footer: {
    position: "absolute",
    bottom: 56,
  },
  footerHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
});
