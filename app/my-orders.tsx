import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { canCancelAsNewOrder } from "../lib/customer";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

type OrderItem = {
  name?: string;
  quantity?: number;
  productId?: string;
  unitPrice?: number;
};

type OrderRow = {
  id: string;
  customer_email: string | null;
  items: OrderItem[] | null;
  total_amount: number | null;
  status: string | null;
  payment_method: string | null;
  delivery_date: string | null;
  created_at: string;
};

// حالة التوصيل
function deliveryStatusLabel(status: string | null | undefined): { label: string; color: string } {
  const v = String(status ?? "").trim().toLowerCase();
  if (v === "new" || v === "pending") return { label: "طلب جديد", color: "#c9a84c" };
  if (v === "in_delivery") return { label: "قيد التوصيل 🚚", color: "#3b82f6" };
  if (v === "delivered") return { label: "تم الاستلام ✅", color: "#22c55e" };
  if (v === "cancelled") return { label: "ملغي ❌", color: "#ef4444" };
  if (v === "refund_requested") return { label: "قيد الاسترجاع 🔄", color: "#f97316" };
  if (v === "paid") return { label: "مؤكد ✅", color: "#22c55e" };
  return { label: "طلب جديد", color: "#c9a84c" };
}

// حالة الدفع
function paymentStatusLabel(method: string | null | undefined, status: string | null | undefined): { label: string; color: string } {
  const m = String(method ?? "").trim().toLowerCase();
  const s = String(status ?? "").trim().toLowerCase();

  if (s === "cancelled") return { label: "ملغي", color: "#ef4444" };
  if (s === "refund_requested") return { label: "قيد الاسترجاع 🔄", color: "#f97316" };

  if (m === "cash") return { label: "كاش عند التسليم 💵", color: "#c9a84c" };
  if (m === "online" || m === "electronic") {
    if (s === "paid") return { label: "مدفوع ✅", color: "#22c55e" };
    return { label: "بانتظار الدفع ⏳", color: "#f97316" };
  }
  return { label: "كاش عند التسليم 💵", color: "#c9a84c" };
}

export default function MyOrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setUserEmail(user.email);

      const { data, error: qErr } = await supabase
        .from("orders")
        .select("id,customer_email,items,total_amount,status,payment_method,delivery_date,created_at")
        .eq("customer_email", user.email)
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      setOrders((data as OrderRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر جلب الطلبات.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const cancelOrder = async (order: OrderRow) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("هل تريد إلغاء هذا الطلب؟")
        : true;

    if (!confirmed) return;

    const isOnline =
      String(order.payment_method ?? "") === "online" ||
      String(order.payment_method ?? "") === "electronic";
    const nextStatus = isOnline ? "refund_requested" : "cancelled";

    // إنشاء طلب استرجاع للدفع الأونلاين
    if (isOnline) {
      const { error: refundErr } = await supabase.from("refund_requests").insert({
        order_id: order.id,
      });
      if (refundErr) {
        if (Platform.OS === "web") window.alert(`تعذر إنشاء طلب الاسترجاع: ${refundErr.message}`);
        return;
      }
    }

    // تحديث الطلب وفك السائق
    const { error: upErr } = await supabase
      .from("orders")
      .update({
        status: nextStatus,
        assigned_driver_id: null,
        assignment_status: null,
        driver_status: null,
      })
      .eq("id", order.id);

    if (upErr) {
      if (Platform.OS === "web") window.alert(upErr.message);
      return;
    }

    // إرجاع المخزون
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      if (!item.productId) continue;
      const { data: inv } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("id", item.productId)
        .single();
      if (inv) {
        const restoredQty = Number(inv.quantity ?? 0) + Number(item.quantity ?? 1);
        await supabase
          .from("inventory")
          .update({ quantity: restoredQty })
          .eq("id", item.productId);
      }
    }

    // إشعار للإدارة
    await supabase.from("notifications").insert({
      title: isOnline ? "طلب استرجاع جديد" : "طلب ملغي",
      body: `طلب ${order.id.slice(0, 8)} — ${isOnline ? "بانتظار موافقة الإدارة على الاسترجاع" : "تم الإلغاء من العميل"}`,
      type: "order",
      reference_id: order.id,
      reference_type: "orders",
      is_read: false,
    });

    if (Platform.OS === "web") {
      window.alert(isOnline
        ? "تم إرسال طلب الاسترجاع وسيتم مراجعته من الإدارة."
        : "تم إلغاء الطلب بنجاح."
      );
    }

    await loadOrders();
  };

  return (
    <>
      <Stack.Screen options={{ title: "طلباتي" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={colors.gold} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !userEmail ? (
            <Text style={styles.muted}>يرجى تسجيل الدخول لعرض طلباتك.</Text>
          ) : orders.length === 0 ? (
            <Text style={styles.muted}>لا توجد طلبات سابقة حتى الآن.</Text>
          ) : (
            orders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const canCancel = canCancelAsNewOrder(order.status);
              const delivery = deliveryStatusLabel(order.status);
              const payment = paymentStatusLabel(order.payment_method, order.status);

              return (
                <View key={order.id} style={styles.card}>
                  {/* رأس الكارد */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString("ar-QA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>

                  {/* حالة التوصيل */}
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>التوصيل:</Text>
                    <View style={[styles.badge, { backgroundColor: delivery.color + "22", borderColor: delivery.color }]}>
                      <Text style={[styles.badgeText, { color: delivery.color }]}>{delivery.label}</Text>
                    </View>
                  </View>

                  {/* حالة الدفع */}
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>الدفع:</Text>
                    <View style={[styles.badge, { backgroundColor: payment.color + "22", borderColor: payment.color }]}>
                      <Text style={[styles.badgeText, { color: payment.color }]}>{payment.label}</Text>
                    </View>
                  </View>

                  {/* موعد التوصيل */}
                  {order.delivery_date ? (
                    <Text style={styles.deliveryDate}>
                      📅 موعد التوصيل: {new Date(`${order.delivery_date}T00:00:00`).toLocaleDateString("ar-QA", {
                        weekday: "short", month: "short", day: "numeric"
                      })}
                    </Text>
                  ) : null}

                  {/* المنتجات */}
                  <View style={styles.itemsWrap}>
                    {items.length === 0 ? (
                      <Text style={styles.item}>— بدون عناصر</Text>
                    ) : (
                      items.map((item, idx) => (
                        <Text key={`${item.name ?? "line"}-${idx}`} style={styles.item}>
                          • {String(item.name ?? "منتج")} × {Number(item.quantity ?? 1)}
                        </Text>
                      ))
                    )}
                  </View>

                  {/* الإجمالي */}
                  <Text style={styles.total}>
                    الإجمالي: {Number(order.total_amount ?? 0).toFixed(2)} QAR
                  </Text>

                  {/* زر الإلغاء */}
                  {canCancel ? (
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => void cancelOrder(order)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={colors.white} />
                      <Text style={styles.cancelText}>إلغاء الطلب</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 44, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderId: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 15,
  },
  orderDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deliveryDate: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "right",
    marginBottom: 8,
  },
  itemsWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  item: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 4,
    fontSize: 13,
  },
  total: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 15,
    textAlign: "right",
  },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  error: { color: colors.red400, textAlign: "center", marginTop: 40 },
  cancelBtn: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.red500,
    borderRadius: radii.md,
    paddingVertical: 10,
  },
  cancelText: { color: colors.white, fontWeight: "800" },
});
