import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  orderPrimaryLabel,
  serializeOrderItems,
} from "../lib/orderFlow";
import { supabase } from "../lib/supabase";
import { cartTotal, useCartStore } from "../store/cartStore";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { colors, radii, spacing } from "../lib/theme";
import { QATAR_COUNTRY_CODE } from "../lib/customer";

type CalendarDay = {
  iso: string;
  day: number;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatArabicDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ar-QA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildDeliveryDays(): CalendarDay[] {
  const base = new Date();
  return Array.from({ length: 14 }, (_, idx) => {
    const date = addDays(base, idx + 1);
    return { iso: toIsoDate(date), day: date.getDate() };
  });
}

export default function PaymentOptionsScreen() {
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clear);

  const orderLines = useCheckoutDraftStore((s) => s.orderLines);
  const fromDirectProduct = useCheckoutDraftStore((s) => s.fromDirectProduct);
  const customerName = useCheckoutDraftStore((s) => s.customerName);
  const customerPhone = useCheckoutDraftStore((s) => s.customerPhone);
  const phoneNumber = useCheckoutDraftStore((s) => s.phoneNumber);
  const notes = useCheckoutDraftStore((s) => s.notes);
  const latitude = useCheckoutDraftStore((s) => s.latitude);
  const longitude = useCheckoutDraftStore((s) => s.longitude);
  const address = useCheckoutDraftStore((s) => s.address);
  const resetDraft = useCheckoutDraftStore((s) => s.reset);

  const [busy, setBusy] = useState<null | "cash" | "online">(null);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string>(
    () => toIsoDate(addDays(new Date(), 1))
  );

  const ready =
    orderLines.length > 0 &&
    Boolean(address?.trim());

  useEffect(() => {
    if (!ready) router.replace("/checkout");
  }, [ready, router]);

  if (!ready) return null;

  const total = cartTotal(orderLines);
  const serialized = serializeOrderItems(orderLines);
  const productLabel = orderPrimaryLabel(orderLines);
  const safeAddress = address?.trim() ?? "";
  const effectivePhone = phoneNumber.trim() || customerPhone.trim();
  const deliveryDays = buildDeliveryDays();

  const basePayload = {
    customer_name: customerName.trim(),
    customer_phone: effectivePhone.startsWith(QATAR_COUNTRY_CODE)
      ? effectivePhone
      : `${QATAR_COUNTRY_CODE}${effectivePhone.replace(/\D/g, "").slice(-8)}`,
    items: serialized,
    total_amount: Math.round(total * 100) / 100,
    delivery_date: selectedDeliveryDate,
    delivery_time: null as string | null,
    notes: notes.trim() || null,
    latitude,
    longitude,
    address: safeAddress,
  };

  const finalizeCart = () => {
    if (!fromDirectProduct) clearCart();
    resetDraft();
  };

  const insertOrderAndSave = async (input: {
    payment_method: string;
    status: string;
  }) => {
    const { data, error: insErr } = await supabase
      .from("orders")
      .insert({
        ...basePayload,
        payment_method: input.payment_method,
        status: input.status,
      })
      .select("id")
      .single();

    if (insErr) throw insErr;
    const orderId = data?.id as string;

    // Decrement inventory quantity for each ordered item.
    for (const line of orderLines) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("id", line.productId)
        .single();

      if (inv && Number(inv.quantity ?? 0) > 0) {
        const newQty = Math.max(0, Number(inv.quantity ?? 0) - line.quantity);
        await supabase
          .from("inventory")
          .update({ quantity: newQty })
          .eq("id", line.productId);
      }
    }

    await supabase.from("notifications").insert({
      title: "طلب جديد",
      body: `${customerName.trim()} — ${productLabel}`,
      type: "order",
      reference_id: orderId,
      reference_type: "orders",
      is_read: false,
    });
    return orderId;
  };

  const onCash = async () => {
    setError(null);
    setBusy("cash");
    try {
      const orderId = await insertOrderAndSave({
        payment_method: "cash",
        status: "pending",
      });
      router.replace({
        pathname: "/order-success",
        params: { orderId, total: String(total) },
      });
      setTimeout(finalizeCart, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تأكيد الطلب.");
    } finally {
      setBusy(null);
    }
  };

  const onOnline = async () => {
    setError(null);
    setBusy("online");
    try {
      const { data, error: insErr } = await supabase
        .from("orders")
        .insert({
          ...basePayload,
          payment_method: "online",
          status: "pending",
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      const orderId = data?.id as string;

      // Decrement inventory quantity for each ordered item.
      for (const line of orderLines) {
        const { data: inv } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("id", line.productId)
          .single();

        if (inv && Number(inv.quantity ?? 0) > 0) {
          const newQty = Math.max(0, Number(inv.quantity ?? 0) - line.quantity);
          await supabase
            .from("inventory")
            .update({ quantity: newQty })
            .eq("id", line.productId);
        }
      }

      await supabase.from("notifications").insert({
        title: "طلب — بانتظار الدفع",
        body: `${customerName.trim()} — ${productLabel}`,
        type: "order",
        reference_id: orderId,
        reference_type: "orders",
        is_read: false,
      });

      router.push({
        pathname: "/payment-mock",
        params: {
          orderId,
          amount: String(Math.round(total * 100) / 100),
          service: productLabel,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر بدء الدفع.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "طريقة الدفع" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.summaryTitle}>ملخص التوصيل</Text>
          <View style={styles.card}>
            <Text style={styles.addr} numberOfLines={4}>
              {safeAddress}
            </Text>
            <Text style={styles.total}>
              الإجمالي: {total.toFixed(2)} QAR
            </Text>
          </View>

          <Text style={styles.sectionTitle}>اختر طريقة الدفع</Text>

          <Text style={styles.sectionTitle}>موعد التوصيل</Text>
          <Pressable style={styles.datePickerBtn} onPress={() => setDatePickerOpen(true)}>
            <Ionicons name="calendar-outline" size={22} color={colors.gold} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{formatArabicDate(selectedDeliveryDate)}</Text>
              <Text style={styles.optionSub}>من الغد حتى 14 يوم</Text>
            </View>
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.option, busy === "online" && styles.optionBusy]}
            onPress={() => void onOnline()}
            disabled={busy !== null}
          >
            {busy === "online" ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <>
                <Ionicons name="card" size={26} color={colors.gold} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>الدفع أونلاين</Text>
                  <Text style={styles.optionSub}>بطاقة عبر بوابة الدفع</Text>
                </View>
                <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.option, busy === "cash" && styles.optionBusy]}
            onPress={() => void onCash()}
            disabled={busy !== null}
          >
            {busy === "cash" ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <>
                <Ionicons name="cash-outline" size={26} color={colors.gold} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>الدفع كاش</Text>
                  <Text style={styles.optionSub}>عند التسليم</Text>
                </View>
                <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
              </>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <Modal
          visible={datePickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDatePickerOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDatePickerOpen(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>اختر تاريخ التوصيل</Text>
              <View style={styles.calendarGrid}>
                {deliveryDays.map((day) => {
                  const active = day.iso === selectedDeliveryDate;
                  return (
                    <Pressable
                      key={day.iso}
                      style={[styles.dayCell, active && styles.dayCellActive]}
                      onPress={() => {
                        setSelectedDeliveryDate(day.iso);
                        setDatePickerOpen(false);
                      }}
                    >
                      <Text style={[styles.dayDate, active && styles.dayDateActive]}>
                        {day.day}
                      </Text>
                      <Text style={[styles.dayMeta, active && styles.dayMetaActive]}>
                        {day.iso.slice(5)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 40 },
  summaryTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  addr: {
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 12,
  },
  total: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "right",
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  optionBusy: { opacity: 0.85 },
  optionText: { flex: 1, alignItems: "flex-end" },
  optionTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 17,
  },
  optionSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  error: {
    color: colors.red400,
    textAlign: "center",
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "right",
    marginBottom: 14,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  dayCell: {
    width: "31%",
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  dayCellActive: {
    backgroundColor: colors.brand,
    borderColor: colors.gold,
  },
  dayDate: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  dayDateActive: {
    color: colors.white,
  },
  dayMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dayMetaActive: {
    color: colors.white,
  },
});
