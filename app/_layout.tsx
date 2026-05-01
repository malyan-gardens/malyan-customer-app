import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { I18nManager, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "../lib/authStore";
import { supabase } from "../lib/supabase";
import { colors } from "../lib/theme";
import { normalizeQatarPhone, QATAR_COUNTRY_CODE } from "../lib/customer";

/** Auth routing runs on `app/index.tsx` only — nothing here blocks the navigator. */

export default function RootLayout() {
  const session = useAuthStore((s) => s.session);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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

  useEffect(() => {
    const user = session?.user;
    if (!user) {
      setPhoneModalVisible(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const existingPhone = normalizeQatarPhone(
        String((profile as { phone?: string } | null)?.phone ?? "")
      );
      if (existingPhone) {
        setPhoneModalVisible(false);
        setPhoneDigits(existingPhone.replace(QATAR_COUNTRY_CODE, ""));
      } else {
        setPhoneDigits("");
        setPhoneModalVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const normalizedPhone = useMemo(
    () => normalizeQatarPhone(phoneDigits),
    [phoneDigits]
  );

  const saveProfilePhone = async () => {
    const user = session?.user;
    if (!user) return;
    if (!/^\+974\d{8}$/.test(normalizedPhone)) {
      setPhoneError("الرقم يجب أن يكون 8 أرقام بعد +974");
      return;
    }
    setSavingPhone(true);
    setPhoneError(null);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? `${user.id}@malyan.local`,
        full_name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""),
        phone: normalizedPhone,
      },
      { onConflict: "id" }
    );
    if (error) {
      setPhoneError(error.message);
      setSavingPhone(false);
      return;
    }
    setSavingPhone(false);
    setPhoneModalVisible(false);
  };

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
        <Stack.Screen name="official-receipt" options={{ title: "الإيصال الرسمي" }} />
        <Stack.Screen name="checkout" options={{ title: "إتمام الطلب" }} />
        <Stack.Screen name="order-location" options={{ title: "موقع التوصيل" }} />
        <Stack.Screen name="payment-options" options={{ title: "طريقة الدفع" }} />
        <Stack.Screen name="my-orders" options={{ title: "طلباتي" }} />
        <Stack.Screen name="my-appointments" options={{ title: "مواعيدي" }} />
        <Stack.Screen
          name="order-success"
          options={{ title: "تم بنجاح", headerBackVisible: false }}
        />
      </Stack>
      <Modal visible={phoneModalVisible} transparent animationType="fade">
        <View style={styles.phoneModalOverlay}>
          <View style={styles.phoneModalCard}>
            <Text style={styles.phoneTitle}>أدخل رقم هاتفك</Text>
            <Text style={styles.phoneSub}>يلزم حفظ الرقم لإتمام الطلبات وربط الحساب</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>{QATAR_COUNTRY_CODE}</Text>
              <TextInput
                value={phoneDigits}
                onChangeText={(v) => {
                  setPhoneDigits(v.replace(/\D/g, "").slice(0, 8));
                  setPhoneError(null);
                }}
                keyboardType="number-pad"
                maxLength={8}
                placeholder="XXXXXXXX"
                placeholderTextColor={colors.textMuted}
                style={styles.phoneInput}
              />
            </View>
            {phoneError ? <Text style={styles.phoneError}>{phoneError}</Text> : null}
            <Pressable
              style={[styles.phoneBtn, savingPhone && { opacity: 0.85 }]}
              onPress={() => void saveProfilePhone()}
              disabled={savingPhone}
            >
              <Text style={styles.phoneBtnText}>{savingPhone ? "جاري الحفظ..." : "حفظ الرقم"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  phoneModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  phoneModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  phoneTitle: {
    color: colors.white,
    textAlign: "right",
    fontWeight: "800",
    fontSize: 18,
  },
  phoneSub: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 8,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  phonePrefix: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 16,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    color: colors.white,
    textAlign: "right",
    fontSize: 16,
    paddingVertical: 10,
  },
  phoneBtn: {
    marginTop: 12,
    backgroundColor: colors.brand,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  phoneBtnText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  phoneError: {
    color: colors.red400,
    textAlign: "center",
    marginTop: 8,
  },
});
