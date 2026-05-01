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
import { canCancelAsNewOrder, orderStatusLabelAr } from "../lib/customer";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

type OrderRow = {
  id: string;
  customer_email: string | null;
  items: Array<{ name?: string; quantity?: number }> | null;
  total_amount: number | null;
  status: string | null;
  payment_method: string | null;
  created_at: string;
};

export default function MyOrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setUserEmail(user.email);

      const { data, error: qErr } = await supabase
        .from("orders")
        .select("id,customer_email,items,total_amount,status,payment_method,created_at")
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

    if (isOnline) {
      const { error: refundErr } = await supabase.from("refund_requests").insert({
        order_id: order.id,
      });
      if (refundErr) {
        if (Platform.OS === "web") window.alert(`تعذر إنشاء طلب الاسترجاع: ${refundErr.message}`);
        return;
      }
    }

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

    if (isOnline) {
      await supabase.from("notifications").insert({
        title: "طلب استرجاع جديد",
        body: `طلب ${order.id.slice(0, 8)} بانتظار موافقة الإدارة على الاسترجاع`,
        type: "order",
        reference_id: order.id,
        reference_type: "orders",
        is_read: false,
      });
      if (Platform.OS === "web") window.alert("تم إرسال طلب الاسترجاع وسيتم مراجعته من الإدارة.");
    } else {
      if (Platform.OS === "web") window.alert("تم إلغاء الطلب بنجاح.");
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
              return (
                <View key={order.id} style={styles.card}>
                  <Text style={styles.row}>رقم الطلب: {order.id.slice(0, 8)}</Text>
                  <Text style={styles.row}>
                    التاريخ:{" "}
                    {new Date(order.created_at).toLocaleDateString("ar-QA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <Text style={styles.row}>الحالة: {orderStatusLabelAr(order.status)}</Text>
                  <Text style={styles.row}>
                    الإجمالي: {Number(order.total_amount ?? 0).toFixed(2)} QAR
                  </Text>
                  <Text style={styles.row}>العناصر:</Text>
                  {items.length === 0 ? (
                    <Text style={styles.item}>- بدون عناصر</Text>
                  ) : (
                    items.map((item, idx) => (
                      <Text key={`${item.name ?? "line"}-${idx}`} style={styles.item}>
                        - {String(item.name ?? "منتج")} × {Number(item.quantity ?? 1)}
                      </Text>
                    ))
                  )}
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
  row: {
    color: colors.white,
    textAlign: "right",
    marginBottom: 6,
    fontSize: 14,
  },
  item: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 4,
    fontSize: 13,
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
