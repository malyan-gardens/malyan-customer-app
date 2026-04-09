import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    productPrice?: string;
    productCurrency?: string;
  }>();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cash" | "electronic">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("تنبيه", "يرجى السماح بالوصول للموقع");
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      const fullAddress = [address?.street, address?.district, address?.city, address?.region]
        .filter(Boolean)
        .join(", ");
      setDeliveryAddress(fullAddress || `${current.coords.latitude}, ${current.coords.longitude}`);
    } catch (_e) {
      Alert.alert("تنبيه", "تعذر تحديد الموقع، يرجى الإدخال يدوياً");
    } finally {
      setDetectingLocation(false);
    }
  };

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
    if (!deliveryAddress.trim()) {
      setError("يرجى إدخال عنوان التوصيل.");
      return;
    }
    if (orderItems.length === 0) {
      setError("السلة فارغة.");
      return;
    }

    setSubmitting(true);
    const payload = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      items: serializeItems(orderItems),
      total_amount: Math.round(total * 100) / 100,
      payment_method: payment === "cash" ? "cash" : "electronic",
      delivery_date: deliveryAddress.trim(),
      delivery_time: null,
      notes: notes.trim() || null,
      status: "pending",
    };

    const { error: insErr } = await supabase.from("orders").insert(payload);

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }

    const productName = orderItems[0]?.nameAr ?? orderItems[0]?.name ?? "منتج";
    await supabase.from("notifications").insert({
      title: "طلب جديد",
      body: `${customerName.trim()} - ${productName}`,
      type: "order",
    });

    if (!directProduct) clear();
    setSubmitting(false);
    if (payment === "electronic") {
      router.push({
        pathname: "/payment-mock",
        params: {
          amount: String(Math.round(total * 100) / 100),
          service: productName,
        },
      });
      return;
    }
    Alert.alert("تم", "تم إرسال طلبك بنجاح! سنتواصل معك قريباً", [
      { text: "حسناً", onPress: () => router.replace("/order-success") },
    ]);
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
            <Text style={styles.totalVal}>
              {total.toFixed(2)} QAR
            </Text>
            <Text style={styles.totalLabel}>الإجمالي</Text>
          </View>

          <Text style={styles.sectionTitle}>طريقة الدفع</Text>
          <Pressable
            style={[styles.payOption, payment === "electronic" && styles.payOn]}
            onPress={() => setPayment("electronic")}
          >
            <Text style={styles.payEmoji}>💳</Text>
            <View style={styles.payTextWrap}>
              <Text style={styles.payTitle}>دفع إلكتروني</Text>
            </View>
            {payment === "electronic" ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.gold} />
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>
          <Pressable
            style={[styles.payOption, payment === "cash" && styles.payOn]}
            onPress={() => setPayment("cash")}
          >
            <Text style={styles.payEmoji}>🤝</Text>
            <View style={styles.payTextWrap}>
              <Text style={styles.payTitle}>نقداً</Text>
            </View>
            {payment === "cash" ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.gold} />
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>

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
          <Text style={styles.label}>عنوان التوصيل</Text>
          <View style={styles.locationRow}>
            <Pressable
              style={[styles.locationBtn, detectingLocation && styles.locationBtnDisabled]}
              onPress={() => void detectLocation()}
              disabled={detectingLocation}
            >
              <Text style={styles.locationBtnText}>
                {detectingLocation ? "جارٍ التحديد..." : "📍 موقعي"}
              </Text>
            </Pressable>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="المنطقة، الشارع، المبنى…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.locationInput]}
            />
          </View>

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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  locationInput: { flex: 1, marginBottom: 0 },
  locationBtn: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  locationBtnDisabled: { opacity: 0.8 },
  locationBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },
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
