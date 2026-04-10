import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cartTotal, useCartStore, type CartLine } from "../store/cartStore";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { colors, radii, shadows, spacing } from "../lib/theme";

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    productPrice?: string;
    productCurrency?: string;
  }>();
  const items = useCartStore((s) => s.items);
  const setCustomerStep = useCheckoutDraftStore((s) => s.setCustomerStep);

  const directProduct = useMemo(() => {
    if (!params.productId || !params.productName) return null;
    return {
      productId: String(params.productId),
      name: String(params.productName),
      nameAr: String(params.productName),
      price: Number(params.productPrice ?? 0),
      currency: String(params.productCurrency ?? "QAR"),
      quantity: 1,
    } as CartLine;
  }, [params.productId, params.productName, params.productPrice, params.productCurrency]);

  const orderItems = directProduct ? [directProduct] : items;
  const total = cartTotal(orderItems);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueToLocation = () => {
    setError(null);
    if (!customerName.trim()) {
      setError("يرجى إدخال الاسم.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("يرجى إدخال رقم الهاتف.");
      return;
    }
    if (orderItems.length === 0) {
      setError("السلة فارغة.");
      return;
    }

    setSubmitting(true);
    setCustomerStep({
      orderLines: orderItems,
      fromDirectProduct: Boolean(directProduct),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
    });
    setSubmitting(false);
    router.push("/order-location" as never);
  };

  if (orderItems.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: "إتمام الطلب" }} />
        <SafeAreaView style={styles.screen} edges={["bottom"]}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>السلة فارغة.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/cart")}>
              <Text style={styles.primaryBtnText}>العودة للسلة</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "إتمام الطلب" }} />
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>ملخص الطلب</Text>
          {orderItems.map((line) => {
            const title = line.nameAr ?? line.name;
            const lineTotal = line.price * line.quantity;
            return (
              <View key={line.productId} style={styles.summaryRow}>
                <Text style={styles.summaryPrice}>
                  {lineTotal.toFixed(2)} {line.currency}
                </Text>
                <Text style={styles.summaryMid}>×{line.quantity}</Text>
                <Text style={styles.summaryName} numberOfLines={2}>
                  {title}
                </Text>
              </View>
            );
          })}
          <View style={styles.totalBar}>
            <Text style={styles.totalVal}>{total.toFixed(2)} QAR</Text>
            <Text style={styles.totalLabel}>الإجمالي</Text>
          </View>

          <Text style={styles.hintBlock}>
            في الخطوة التالية سنطلب إذن الموقع لعرض موقع التوصيل على الخريطة واختيار طريقة الدفع.
          </Text>

          <Text style={styles.sectionTitle}>بيانات التواصل</Text>
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="الاسم الكامل"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+974 …"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>ملاحظات (اختياري)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="تعليمات التوصيل…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMulti]}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
            onPress={continueToLocation}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <>
                <Text style={styles.confirmText}>متابعة — موقع التوصيل</Text>
                <Ionicons name="location" size={22} color={colors.bg} />
              </>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  pad: { padding: spacing.md, paddingBottom: 48 },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    marginTop: spacing.md,
    marginBottom: 12,
  },
  hintBlock: {
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 22,
    fontSize: 13,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  summaryName: {
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    fontSize: 14,
  },
  summaryMid: { color: colors.textMuted, fontSize: 13, minWidth: 36, textAlign: "center" },
  summaryPrice: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 14,
    minWidth: 88,
    textAlign: "left",
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: { color: colors.white, fontWeight: "800", fontSize: 16 },
  totalVal: { color: colors.gold, fontWeight: "800", fontSize: 20 },
  label: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    padding: 14,
    textAlign: "right",
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  inputMulti: { minHeight: 88, textAlignVertical: "top" },
  error: {
    color: colors.red400,
    textAlign: "center",
    marginBottom: 12,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    ...shadows.goldGlow,
  },
  confirmBtnDisabled: { opacity: 0.85 },
  confirmText: { color: colors.bg, fontWeight: "800", fontSize: 18 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  emptyText: { color: colors.textMuted, marginBottom: 20 },
  primaryBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  primaryBtnText: { color: colors.white, fontWeight: "800" },
});
