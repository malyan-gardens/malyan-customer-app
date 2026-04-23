import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CONTACT } from "../lib/contact";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

type ReceiptItem = {
  name?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  currency?: string;
};

export default function OfficialReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = String(params.orderId ?? "").trim();
  const [loading, setLoading] = useState(Boolean(orderId));
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (!mounted) return;
      setOrder((data as Record<string, unknown> | null) ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const items = useMemo(() => {
    const raw = order?.items;
    return (Array.isArray(raw) ? raw : []) as ReceiptItem[];
  }, [order?.items]);

  const total = Number(order?.total_amount ?? 0);
  const paymentMethod = String(order?.payment_method ?? "online");
  const paymentMethodLabel = paymentMethod === "online" ? "دفع إلكتروني" : "دفع نقدي";
  const createdAt = String(order?.created_at ?? "");
  const createdAtLabel = createdAt
    ? new Date(createdAt).toLocaleString("ar-QA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <>
      <Stack.Screen options={{ title: "الإيصال الرسمي", headerBackVisible: false }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <Text style={styles.company}>Malyan Gardens</Text>
            <Text style={styles.companySub}>الإيصال الرسمي للدفع</Text>
            <Text style={styles.companySub}>{CONTACT.websiteDisplay}</Text>
          </View>

          <View style={styles.card}>
            {loading ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <>
                <Text style={styles.line}>رقم الطلب: {orderId ? orderId.slice(0, 8) : "—"}</Text>
                <Text style={styles.line}>التاريخ: {createdAtLabel}</Text>
                <Text style={styles.line}>طريقة الدفع: {paymentMethodLabel}</Text>
                <Text style={styles.line}>الإجمالي: {total.toFixed(2)} QAR</Text>
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>العناصر</Text>
            {items.length === 0 ? (
              <Text style={styles.itemRow}>لا توجد عناصر.</Text>
            ) : (
              items.map((item, index) => (
                <Text key={`${item.name ?? "line"}-${index}`} style={styles.itemRow}>
                  {String(item.name ?? "منتج")} × {Number(item.quantity ?? 1)} —{" "}
                  {Number(item.lineTotal ?? 0).toFixed(2)} {String(item.currency ?? "QAR")}
                </Text>
              ))
            )}
          </View>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              Alert.alert(
                "PDF قريباً",
                "سيتم تفعيل تنزيل PDF تلقائياً مع بوابة الدفع الرسمية."
              )
            }
          >
            <Ionicons name="download-outline" size={20} color={colors.white} />
            <Text style={styles.secondaryText}>تنزيل PDF (قريباً)</Text>
          </Pressable>

          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/home")}>
            <Ionicons name="home-outline" size={20} color={colors.bg} />
            <Text style={styles.primaryText}>العودة للرئيسية</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 48 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    padding: spacing.lg,
    alignItems: "flex-end",
    marginBottom: spacing.md,
    ...shadows.card,
  },
  company: { color: colors.gold, fontSize: 20, fontWeight: "800" },
  companySub: { color: colors.textSecondary, marginTop: 4, textAlign: "right" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "flex-end",
    gap: 8,
  },
  section: { color: colors.white, fontWeight: "800", fontSize: 16, textAlign: "right" },
  line: { color: colors.textSecondary, fontSize: 14, textAlign: "right", width: "100%" },
  itemRow: { color: colors.white, fontSize: 14, textAlign: "right", width: "100%" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: 14,
    marginBottom: 10,
  },
  secondaryText: { color: colors.white, fontWeight: "800" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    paddingVertical: 16,
    ...shadows.goldGlow,
  },
  primaryText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
});
