import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "../lib/authStore";
import { supabase } from "../lib/supabase";
import { colors } from "../lib/theme";

/** Auth routing runs on `app/index.tsx` only — nothing here blocks the navigator. */

export default function RootLayout() {
  useEffect(() => {
    I18nManager.allowRTL(true);
    if (Platform.OS !== "web" && !I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        useAuthStore.getState().setSession(session);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        useAuthStore.setState({ session: null });
      } else if (event === "SIGNED_IN" && session) {
        useAuthStore.getState().setSession(session);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade_from_bottom",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="phone-input" options={{ title: "تسجيل برقم الهاتف" }} />
        <Stack.Screen name="otp-verify" options={{ title: "تأكيد OTP" }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="malyan-ai" options={{ headerShown: false }} />
        <Stack.Screen
          name="ai-design-wizard"
          options={{ title: "تصميم ذكي للمساحات" }}
        />
        <Stack.Screen
          name="ai-plant-doctor"
          options={{ title: "طبيب النباتات الذكي" }}
        />
        <Stack.Screen name="ai-my-designs" options={{ title: "تصاميمي" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[id]"
          options={{ title: "تفاصيل المنتج" }}
        />
        <Stack.Screen
          name="plants"
          options={{ title: "المنتجات" }}
        />
        <Stack.Screen name="maintenance" options={{ title: "الصيانة" }} />
        <Stack.Screen
          name="design"
          options={{ title: "تصميم المساحات" }}
        />
        <Stack.Screen name="payment-mock" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ title: "إتمام الطلب" }} />
        <Stack.Screen name="order-location" options={{ title: "موقع التوصيل" }} />
        <Stack.Screen name="payment-options" options={{ title: "طريقة الدفع" }} />
        <Stack.Screen name="order-success" options={{ title: "تم بنجاح" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
