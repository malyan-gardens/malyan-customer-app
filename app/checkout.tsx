import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { cartTotal, useCartStore, type CartLine } from "../store/cartStore";
import { colors, radii, shadows, spacing } from "../lib/theme";
import { supabase } from "../lib/supabase";

const TIME_SLOTS: { id: string; label: string }[] = [
  { id: "morning", label: "صباحاً 9:00 - 12:00" },
  { id: "noon", label: "ظهراً 12:00 - 15:00" },
  { id: "afternoon", label: "مساءً 15:00 - 18:00" },
  { id: "evening", label: "مساءً 18:00 - 21:00" },
];

function nextSevenDaysExcludingFriday(): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let add = 0; add < 21 && out.length < 7; add++) {
    const d = new Date(start);
    d.setDate(start.getDate() + add);
    if (d.getDay() === 5) continue;
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ar-QA", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    out.push({ iso, label });
  }
  return out;
}

function serializeItems(items: CartLine[]) {
  return items.map((i) => ({
    productId: i.productId,
    name: i.nameAr ?? i.name,
    quantity: i.quantity,
    unitPrice: i.price,
    currency: i.currency,
    lineTotal: i.price * i.quantity,
  }));
}

export default function CheckoutScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const total = cartTotal(items);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cash" | "online">("cash");
  const [deliveryDate, setDeliveryDate] = useState<string | null>(
    () => nextSevenDaysExcludingFriday()[0]?.iso ?? null
  );
  const [deliveryTime, setDeliveryTime] = useState<string | null>(
    () => TIME_SLOTS[0]?.label ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateOptions = useMemo(() => nextSevenDaysExcludingFriday(), []);

  const submit = async () => {
    setError(null);
    if (!customerName.trim()) {
      setError("يرجى إدخال الاسم.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("يرجى إدخال رقم الهاتف.");
      return;
    }
    if (!deliveryDate) {
      setError("اختر يوم التوصيل.");
      return;
    }
    if (!deliveryTime) {
      setError("اختر فترة التوصيل.");
      return;
    }
    if (items.length === 0) {
      setError("السلة فارغة.");
      return;
    }

    setSubmitting(true);
    const payload = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      items: serializeItems(items),
      total_amount: Math.round(total * 100) / 100,
      payment_method: payment === "cash" ? "cash" : "online",
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      notes: notes.trim() || null,
      status: "pending",
    };

    const { error: insErr } = await supabase.from("orders").insert(payload);

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }

    clear();
    setSubmitting(false);
    router.replace("/order-success");
  };

  if (items.length === 0) {
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>ملخص الطلب</Text>
          {items.map((line) => {
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
            <Text style={styles.totalVal}>
              {total.toFixed(2)} QAR
            </Text>
            <Text style={styles.totalLabel}>الإجمالي</Text>
          </View>

          <Text style={styles.sectionTitle}>طريقة الدفع</Text>
          <Pressable
            style={[styles.payOption, styles.payDisabled]}
            disabled
            onPress={() => {}}
          >
            <Text style={styles.payEmoji}>💳</Text>
            <View style={styles.payTextWrap}>
              <Text style={styles.payTitleMuted}>الدفع أونلاين</Text>
              <Text style={styles.payHint}>قريباً — غير متاح حالياً</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.payOption, payment === "cash" && styles.payOn]}
            onPress={() => setPayment("cash")}
          >
            <Text style={styles.payEmoji}>🤝</Text>
            <View style={styles.payTextWrap}>
              <Text style={styles.payTitle}>الدفع عند الاستلام</Text>
              <Text style={styles.paySub}>نقداً عند التوصيل</Text>
            </View>
            {payment === "cash" ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.gold} />
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>

          <Text style={styles.sectionTitle}>يوم التوصيل</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateChips}>
              {dateOptions.map((d) => (
                <Pressable
                  key={d.iso}
                  onPress={() => setDeliveryDate(d.iso)}
                  style={[
                    styles.dateChip,
                    deliveryDate === d.iso && styles.dateChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      deliveryDate === d.iso && styles.dateChipTextOn,
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.sectionTitle}>وقت التوصيل</Text>
          {TIME_SLOTS.map((slot) => (
            <Pressable
              key={slot.id}
              onPress={() => setDeliveryTime(slot.label)}
              style={[
                styles.slotRow,
                deliveryTime === slot.label && styles.slotRowOn,
              ]}
            >
              <Text
                style={[
                  styles.slotText,
                  deliveryTime === slot.label && styles.slotTextOn,
                ]}
              >
                {slot.label}
              </Text>
              {deliveryTime === slot.label ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
              ) : null}
            </Pressable>
          ))}

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
            placeholder="تعليمات التوصيل، الموقع…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMulti]}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <>
                <Text style={styles.confirmText}>تأكيد الطلب</Text>
                <Ionicons name="checkmark-done" size={22} color={colors.bg} />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  payOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
    gap: 12,
  },
  payDisabled: { opacity: 0.65 },
  payOn: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  payEmoji: { fontSize: 22 },
  payTextWrap: { flex: 1, alignItems: "flex-end" },
  payTitle: { color: colors.white, fontWeight: "800", fontSize: 16 },
  payTitleMuted: { color: colors.textMuted, fontWeight: "700", fontSize: 16 },
  paySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  payHint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  radioOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dateChips: { flexDirection: "row", gap: 10, paddingVertical: 4, marginBottom: 8 },
  dateChip: {
    maxWidth: 200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateChipOn: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  dateChipText: { color: colors.textSecondary, fontSize: 13, textAlign: "center" },
  dateChipTextOn: { color: colors.white, fontWeight: "700" },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  slotRowOn: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  slotText: { color: colors.textSecondary, fontSize: 15, textAlign: "right", flex: 1 },
  slotTextOn: { color: colors.white, fontWeight: "700" },
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
