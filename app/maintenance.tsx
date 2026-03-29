import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../lib/theme";

const PACKAGES = [
  {
    id: "monthly",
    title: "صيانة شهرية",
    price: "150",
    unit: "شهرياً",
    detail: "زيارة مجدولة وتنظيف ومراجعة للنباتات",
  },
  {
    id: "quarter",
    title: "صيانة ربع سنوية",
    price: "400",
    unit: "كل 3 أشهر",
    detail: "باقة توفير مع فحص أعمق للمساحة",
  },
  {
    id: "urgent",
    title: "زيارة طارئة",
    price: "200",
    unit: "للزيارة",
    detail: "استجابة سريعة عند الحاجة",
  },
];

export default function MaintenanceScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [location, setLocation] = useState("");

  const book = () => {
    Alert.alert(
      "طلب الحجز",
      "سيتم ربط هذا النموذج بجدول المواعيد في Supabase لاحقاً.",
      [{ text: "حسناً" }]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "الصيانة" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.brandDark, colors.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>خدمات الصيانة</Text>
            <Text style={styles.heroSub}>
              فريق ماليان يحافظ على جمال مساحتك طوال العام
            </Text>
          </LinearGradient>

          {PACKAGES.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={({ pressed }) => [
                styles.pkg,
                selected === p.id && styles.pkgOn,
                pressed && { opacity: 0.95 },
              ]}
            >
              <View style={styles.pkgTop}>
                <Text style={styles.pkgTitle}>{p.title}</Text>
                <View style={styles.priceTag}>
                  <Text style={styles.priceVal}>{p.price}</Text>
                  <Text style={styles.priceCur}>QAR</Text>
                </View>
              </View>
              <Text style={styles.pkgUnit}>{p.unit}</Text>
              <Text style={styles.pkgDetail}>{p.detail}</Text>
            </Pressable>
          ))}

          <Text style={styles.sectionTitle}>حجز موعد</Text>
          <Text style={styles.label}>التاريخ (مثال: 2026-04-15)</Text>
          <TextInput
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.label}>الوقت</Text>
          <TextInput
            value={timeStr}
            onChangeText={setTimeStr}
            placeholder="مثال: 10:00 ص"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.label}>الموقع</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="المنطقة، المبنى، رقم الوحدة…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMulti]}
            multiline
          />

          <Pressable style={styles.bookBtn} onPress={book}>
            <Ionicons name="calendar" size={22} color="#fff" />
            <Text style={styles.bookBtnText}>تأكيد الحجز</Text>
          </Pressable>

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
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 40 },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "right",
  },
  heroSub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
    textAlign: "right",
    lineHeight: 22,
    fontSize: 15,
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
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
  },
  pkgTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pkgTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    backgroundColor: colors.brandMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  priceVal: { color: colors.gold, fontWeight: "800", fontSize: 18 },
  priceCur: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  pkgUnit: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 6,
    fontSize: 14,
  },
  pkgDetail: {
    color: colors.textMuted,
    textAlign: "right",
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
    ...shadows.soft,
  },
  bookBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },
  aiBtn: {
    marginTop: spacing.md,
    paddingVertical: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
    alignItems: "center",
  },
  aiBtnText: { color: colors.gold, fontWeight: "800", fontSize: 16 },
});
