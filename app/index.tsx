import { LinearGradient } from "expo-linear-gradient";
import { useRootNavigationState, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MalyanLogo } from "../components/MalyanLogo";
import { supabase } from "../lib/supabase";
import { colors } from "../lib/theme";

const SESSION_RESOLVE_TIMEOUT_MS = 3000;
const MIN_SPLASH_MS = 900;
/** If the root navigator never mounts, still leave the splash (avoids infinite splash). */
const NAV_READY_FALLBACK_MS = 5000;

export default function SplashScreen() {
  const router = useRouter();
  const rootNavigation = useRootNavigationState();
  const didNavigate = useRef(false);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const go = useCallback(
    (target: "home" | "login") => {
      if (didNavigate.current) return;
      didNavigate.current = true;
      const href = target === "home" ? "/(tabs)/home" : "/login";
      try {
        router.replace(href as never);
      } catch {
        router.replace("/login" as never);
      }
    },
    [router]
  );

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
    if (rootNavigation?.key) {
      return;
    }
    const t = setTimeout(() => go("login"), NAV_READY_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [go, rootNavigation?.key]);

  useEffect(() => {
    if (!rootNavigation?.key) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const sessionRace = Promise.race([
        supabase.auth.getSession().catch(() => ({ data: { session: null } })),
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(
            () => resolve({ data: { session: null } }),
            SESSION_RESOLVE_TIMEOUT_MS
          )
        ),
      ]);

      const [sessionOutcome] = await Promise.all([
        sessionRace,
        new Promise<void>((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);

      if (cancelled) return;

      const session = sessionOutcome?.data?.session ?? null;
      go(session ? "home" : "login");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [go, rootNavigation?.key]);

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
