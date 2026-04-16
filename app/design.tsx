import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../lib/theme";

const PORTFOLIO = [
  { key: "1", title: "لوبي فندق", tone: ["#1a3d2e", "#0a0a0a"] as const },
  { key: "2", title: "مكتب تنفيذي", tone: ["#2d4a3a", "#111"] as const },
  { key: "3", title: "حديقة سكنية", tone: ["#145e2f", "#0a0a0a"] as const },
  { key: "4", title: "صالة استقبال", tone: ["#1a7a3c", "#063015"] as const },
];

const SERVICES = [
  "تصميم مكتب",
  "تصميم فندق / لوبي",
  "تصميم منزل",
  "تصميم حديقة",
];

export default function DesignScreen() {
  const router = useRouter();
  const [projectLocation, setProjectLocation] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

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
      setProjectLocation(fullAddress || `${current.coords.latitude}, ${current.coords.longitude}`);
    } catch (_e) {
      Alert.alert("تنبيه", "تعذر تحديد الموقع، يرجى الإدخال يدوياً");
    } finally {
      setDetectingLocation(false);
    }
  };

  const quote = () => {
    Alert.alert(
      "طلب عرض سعر",
      projectLocation.trim()
        ? `تم استلام طلبك لموقع: ${projectLocation}`
        : "سيتم إرسال الطلب إلى لوحة تحكم الإدارة عند ربط Supabase.",
      [{ text: "حسناً" }]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "تصميم المساحات" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.introTitle}>معرض أعمالنا</Text>
          <Text style={styles.introSub}>
            مشاريع اختارت مليان للأناقة والاستدامة البصرية
          </Text>

          <View style={styles.gallery}>
            {PORTFOLIO.map((p) => (
              <LinearGradient
                key={p.key}
                colors={[...p.tone]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.galleryCard}
              >
                <Ionicons name="images" size={32} color={colors.gold} />
                <Text style={styles.galleryTitle}>{p.title}</Text>
              </LinearGradient>
            ))}
          </View>

          <Text style={styles.sectionTitle}>خدمات التصميم</Text>
          <View style={styles.svcGrid}>
            {SERVICES.map((s) => (
              <View key={s} style={styles.svcChip}>
                <Text style={styles.svcChipText}>{s}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.aiBtn}
            onPress={() => router.push("/ai-design-wizard")}
          >
            <Text style={styles.aiBtnText}>🤖 مساعد التصميم الذكي</Text>
            <Text style={styles.aiHint}>
              صف المساحة والميزانية والأسلوب — المساعد يقترح لك التشكيلة المناسبة
            </Text>
          </Pressable>

          <Pressable style={styles.quoteBtn} onPress={quote}>
            <Ionicons name="send" size={20} color={colors.bg} />
            <Text style={styles.quoteBtnText}>طلب عرض سعر</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>موقع المشروع</Text>
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
              value={projectLocation}
              onChangeText={setProjectLocation}
              placeholder="المنطقة، الشارع، المبنى…"
              placeholderTextColor={colors.textMuted}
              style={styles.locationInput}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 40 },
  introTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "right",
  },
  introSub: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 8,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: spacing.lg,
  },
  galleryCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  galleryTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
    textAlign: "right",
    marginTop: 12,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  svcChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  svcChipText: { color: colors.textSecondary, fontWeight: "700" },
  aiBtn: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
    alignItems: "flex-end",
  },
  aiBtnText: { color: colors.gold, fontWeight: "800", fontSize: 17 },
  aiHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "right",
    marginTop: 8,
    lineHeight: 20,
  },
  quoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: spacing.md,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radii.lg,
    ...shadows.goldGlow,
  },
  quoteBtnText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 17,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  locationInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    padding: 12,
    textAlign: "right",
    fontSize: 15,
  },
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
});
