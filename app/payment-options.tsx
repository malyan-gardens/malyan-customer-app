import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  buildOrderInvoiceMessage,
  openInvoiceWhatsAppToBusiness,
  orderPrimaryLabel,
  serializeOrderItems,
} from "../lib/orderFlow";
import { supabase } from "../lib/supabase";
import { cartTotal, useCartStore } from "../store/cartStore";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { colors, radii, spacing } from "../lib/theme";

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

  const basePayload = {
    customer_name: customerName.trim(),
    customer_phone: effectivePhone,
    items: serialized,
    total_amount: Math.round(total * 100) / 100,
    delivery_date: null as string | null,
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

  const insertOrderAndWhatsApp = async (input: {
    payment_method: string;
    status: string;
    paymentLabel: string;
    statusLine: string;
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
      message: `${customerName.trim()} — ${productLabel} (${input.status})`,
      body: `${customerName.trim()} — ${productLabel}`,
      type: "order",
      reference_id: orderId,
      reference_type: "orders",
      read: false,
    });

    const invoiceText = buildOrderInvoiceMessage({
      orderId,
      customerName: customerName.trim(),
      customerPhone: effectivePhone,
      address: safeAddress,
      latitude,
      longitude,
      items: serialized,
      total,
      paymentLabel: input.paymentLabel,
      statusLine: input.statusLine,
    });
    await openInvoiceWhatsAppToBusiness(invoiceText);
    return orderId;
  };

  const onCash = async () => {
    setError(null);
    setBusy("cash");
    try {
      await insertOrderAndWhatsApp({
        payment_method: "cash",
        status: "pending_cash",
        paymentLabel: "الدفع كاش عند الاستلام",
        statusLine: "بانتظار التحصيل — سيؤكد السائق الاستلام ثم التسليم",
      });
      finalizeCart();
      router.replace("/order-success");
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
          status: "pending_payment",
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
        message: `${customerName.trim()} — ${productLabel}`,
        body: `${customerName.trim()} — ${productLabel}`,
        type: "order",
        reference_id: orderId,
        reference_type: "orders",
        read: false,
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
                  <Text style={styles.optionSub}>عند التسليم — حالة الطلب: بانتظار الكاش</Text>
                </View>
                <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
              </>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
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
});
