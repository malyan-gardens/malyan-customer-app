import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

const BG = "#0a0a0a";
const GREEN = "#1a7a3c";
const GOLD = "#c9a84c";

type PackageDef = {
  id: string;
  name: string;
  priceLabel: string;
  /** null = quote / no fixed price */
  totalAmount: number | null;
  detail: string;
};

const PACKAGES: PackageDef[] = [
  {
    id: "visit_one",
    name: "زيارة واحدة",
    priceLabel: "500 QAR",
    totalAmount: 500,
    detail: "3 فنيين، 4 ساعات، حتى 500م²",
  },
  {
    id: "monthly_8",
    name: "باقة شهرية (8 زيارات)",
    priceLabel: "2,500 QAR/شهر",
    totalAmount: 2500,
    detail: "للحدائق الصغيرة والمتوسطة",
  },
  {
    id: "large_garden",
    name: "حديقة كبيرة (+500م²)",
    priceLabel: "طلب تسعير",
    totalAmount: null,
    detail: "السعر حسب الحجم",
  },
];

const TEL = "tel:+97450963373";

export default function MaintenanceScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<PackageDef | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"electronic" | "cash">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!selected) return;
    setError(null);
    if (!customerName.trim()) {
      setError("يرجى إدخال اسم العميل.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("يرجى إدخال رقم الهاتف.");
      return;
    }
    if (!location.trim()) {
      setError("يرجى إدخال العنوان / الموقع.");
      return;
    }
    if (!scheduledDate.trim() || !scheduledTime.trim()) {
      setError("يرجى إدخال تاريخ ووقت الزيارة.");
      return;
    }

    setSubmitting(true);
    const row = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      service_type: selected.name,
      location: location.trim(),
      scheduled_date: scheduledDate.trim(),
      scheduled_time: scheduledTime.trim(),
      notes: notes.trim() || null,
      payment_method: paymentMethod === "electronic" ? "electronic" : "cash",
      status: "pending",
      total_amount: selected.totalAmount,
    };

    const { data: insData, error: insErr } = await supabase
      .from("maintenance_requests")
      .insert(row)
      .select("id")
      .single();

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }

    const notifBody = `${customerName.trim()} — ${selected.name}`;
    const { error: notifErr } = await supabase.from("notifications").insert({
      title: "طلب صيانة جديد",
      body: notifBody,
      type: "maintenance",
    });
    if (notifErr) {
      setError(`تم حفظ الطلب لكن تعذر إنشاء الإشعار: ${notifErr.message}`);
    }

    setLastRequestId(insData?.id ?? null);
    setSubmitting(false);

    if (paymentMethod === "electronic") {
      router.push({
        pathname: "/payment-mock",
        params: {
          amount: String(selected.totalAmount ?? 0),
          service: selected.name,
        },
      });
      return;
    }

    setSuccess(true);
    Alert.alert("تم", "تم إرسال طلبك بنجاح! سنتواصل معك قريباً", [{ text: "حسناً" }]);
  };

  const cancelRequest = () => {
    if (!lastRequestId) return;
    Alert.alert("إلغاء الطلب", "هل تريد إلغاء آخر طلب صيانة أرسلته؟", [
      { text: "لا", style: "cancel" },
      {
        text: "نعم، إلغاء",
        style: "destructive",
        onPress: async () => {
          const { error: delErr } = await supabase
            .from("maintenance_requests")
            .delete()
            .eq("id", lastRequestId);
          if (delErr) {
            Alert.alert("خطأ", delErr.message);
            return;
          }
          setLastRequestId(null);
          setSuccess(false);
          Alert.alert("تم", "تم إلغاء الطلب.");
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: "حجز الصيانة" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heroTitle}>خدمات الصيانة — مليان للحدائق</Text>
            <Text style={styles.heroSub}>
              اختر الباقة، ثم أكمل بيانات الحجز. فريق مليان يحافظ على جمال مساحتك.
            </Text>

            <Text style={styles.sectionTitle}>الباقات</Text>
            {PACKAGES.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setSelected(p);
                  setSuccess(false);
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.pkg,
                  selected?.id === p.id && styles.pkgOn,
                  pressed && { opacity: 0.95 },
                ]}
              >
                <View style={styles.pkgTop}>
                  <Text style={styles.pkgTitle}>{p.name}</Text>
                  <Text style={styles.priceGold}>{p.priceLabel}</Text>
                </View>
                <Text style={styles.pkgDetail}>{p.detail}</Text>
              </Pressable>
            ))}

            {selected ? (
              <View style={styles.formBlock}>
                <Text style={styles.sectionTitle}>بيانات الحجز</Text>
                <Text style={styles.label}>اسم العميل</Text>
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
                <Text style={styles.label}>العنوان / الموقع</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="المنطقة، الشارع، المبنى…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.label}>تاريخ الزيارة</Text>
                <TextInput
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  placeholder="مثال: 2026-04-15"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.label}>وقت الزيارة</Text>
                <TextInput
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  placeholder="مثال: 10:00 – 14:00"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Text style={styles.label}>ملاحظات (اختياري)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="تفاصيل إضافية…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.inputMulti]}
                  multiline
                />

                <Text style={styles.label}>طريقة الدفع</Text>
                <View style={styles.payRow}>
                  <Pressable
                    style={[
                      styles.payBtn,
                      paymentMethod === "electronic" && styles.payBtnOn,
                    ]}
                    onPress={() => setPaymentMethod("electronic")}
                  >
                    <Text
                      style={[
                        styles.payBtnText,
                        paymentMethod === "electronic" && styles.payBtnTextOn,
                      ]}
                    >
                      دفع إلكتروني
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.payBtn,
                      paymentMethod === "cash" && styles.payBtnOn,
                    ]}
                    onPress={() => setPaymentMethod("cash")}
                  >
                    <Text
                      style={[
                        styles.payBtnText,
                        paymentMethod === "cash" && styles.payBtnTextOn,
                      ]}
                    >
                      نقداً
                    </Text>
                  </Pressable>
                </View>

                {error ? <Text style={styles.err}>{error}</Text> : null}

                <Pressable
                  style={[styles.submitBtn, submitting && { opacity: 0.85 }]}
                  onPress={() => void submit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.submitText}>إرسال الطلب</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL(TEL)}
            >
              <Ionicons name="call" size={22} color={GOLD} />
              <Text style={styles.callText}>اتصل بنا</Text>
            </Pressable>

            {lastRequestId ? (
              <Pressable onPress={cancelRequest}>
                <Text style={styles.cancelLink}>إلغاء طلب</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.aiBtn}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/assistant",
                  params: {
                    from: "maintenance",
                    initialContext:
                      "أنا هنا لمساعدتك في خدمات الصيانة. صف لي المشكلة أو نوع الخدمة التي تحتاجها.",
                  },
                })
              }
            >
              <Text style={styles.aiBtnText}>🤖 مساعد الصيانة الذكي</Text>
            </Pressable>

            {success ? (
              <Text style={styles.successNote}>
                تم إرسال طلبك بنجاح! سنتواصل معك قريباً
              </Text>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const font = Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined });

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 48 },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    fontFamily: font,
  },
  heroSub: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 8,
    lineHeight: 22,
    marginBottom: spacing.lg,
    fontFamily: font,
  },
  sectionTitle: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
    fontFamily: font,
  },
  pkg: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  pkgOn: {
    borderColor: GREEN,
    backgroundColor: "rgba(26,122,60,0.18)",
  },
  pkgTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  pkgTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
    fontFamily: font,
  },
  priceGold: {
    color: GOLD,
    fontWeight: "800",
    fontSize: 15,
    fontFamily: font,
  },
  pkgDetail: {
    color: colors.textMuted,
    textAlign: "right",
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: font,
  },
  formBlock: { marginTop: spacing.md },
  label: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: font,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: "#fff",
    padding: 14,
    textAlign: "right",
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: font,
  },
  inputMulti: { minHeight: 88, textAlignVertical: "top" },
  payRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
  payBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  payBtnOn: {
    borderColor: GREEN,
    backgroundColor: "rgba(26,122,60,0.25)",
  },
  payBtnText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
    fontFamily: font,
  },
  payBtnTextOn: { color: "#fff" },
  err: {
    color: colors.red400,
    textAlign: "center",
    marginBottom: 12,
    fontFamily: font,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
    ...shadows.soft,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 17, fontFamily: font },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "rgba(201,168,76,0.12)",
  },
  callText: {
    color: GOLD,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: font,
  },
  cancelLink: {
    color: colors.red400,
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
    fontWeight: "600",
    fontFamily: font,
  },
  aiBtn: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: colors.goldMuted,
    alignItems: "center",
  },
  aiBtnText: { color: GOLD, fontWeight: "800", fontSize: 15, fontFamily: font },
  successNote: {
    color: GOLD,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "700",
    fontFamily: font,
  },
});
