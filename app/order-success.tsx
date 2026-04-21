import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string; total?: string }>();
  const orderId = String(params.orderId ?? "").trim();
  const totalParam = Number(params.total ?? 0);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (!cancelled) {
        setOrder((data as Record<string, unknown> | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const paymentMethodRaw = String(order?.payment_method ?? "");
  const paymentMethodAr =
    paymentMethodRaw === "cash"
      ? "كاش"
      : paymentMethodRaw === "online"
        ? "أونلاين"
        : "—";
  const totalValue = Number(
    order?.total_amount != null ? Number(order.total_amount) : Number.isFinite(totalParam) ? totalParam : 0
  );
  const shortOrderId = orderId ? orderId.slice(0, 8) : "—";
  const orderAddress = String(order?.address ?? "—");

  return (
    <>
      <Stack.Screen options={{ title: "تم بنجاح", headerBackVisible: false }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={72} color={colors.gold} />
          </View>
          <Text style={styles.title}>✅ تم استلام طلبك بنجاح</Text>

          <View style={styles.receiptCard}>
            {loading ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <>
                <Text style={styles.rowText}>رقم الطلب: {shortOrderId}</Text>
                <Text style={styles.rowText}>الإجمالي: {totalValue.toFixed(2)} QAR</Text>
                <Text style={styles.rowText}>العنوان: {orderAddress}</Text>
                <Text style={styles.rowText}>طريقة الدفع: {paymentMethodAr}</Text>
              </>
            )}
          </View>

          <Text style={styles.sub}>سنتواصل معك قريباً</Text>

          <Pressable style={styles.btn} onPress={() => router.replace("/(tabs)/home")}>
            <Text style={styles.btnText}>العودة للرئيسية</Text>
            <Ionicons name="home" size={20} color={colors.bg} />
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => router.replace("/(tabs)/profile")}>
            <Text style={styles.btnSecondaryText}>طلباتي</Text>
            <Ionicons name="receipt-outline" size={20} color={colors.white} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    marginBottom: 24,
    ...shadows.goldGlow,
  },
  receiptCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: 18,
    alignItems: "flex-end",
    gap: 8,
  },
  rowText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "right",
    width: "100%",
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 34,
    marginBottom: 16,
    width: "100%",
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "right",
    lineHeight: 26,
    marginBottom: 20,
    width: "100%",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radii.lg,
    ...shadows.goldGlow,
  },
  btnText: { color: colors.bg, fontWeight: "800", fontSize: 17 },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radii.lg,
    marginTop: 12,
    width: "100%",
  },
  btnSecondaryText: { color: colors.white, fontWeight: "800", fontSize: 17 },
});
