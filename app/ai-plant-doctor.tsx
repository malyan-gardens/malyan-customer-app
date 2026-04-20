import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { colors, radii, spacing } from "../lib/theme";
import { MalyanLogo } from "../components/MalyanLogo";
import { useCartStore } from "../store/cartStore";
import {
  invokeMalyanAi,
  requestUnavailableProduct,
  type AiRecommendation,
  type InvokeAiPayload,
} from "../lib/malyan-ai";

type Pref = "natural" | "artificial" | "mixed";

export default function AiPlantDoctorScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [pref, setPref] = useState<Pref>("mixed");
  const [symptoms, setSymptoms] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [maintenance, setMaintenance] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [diagnosis, recommendations.length, loading]);

  async function pickImage() {
    setError(null);
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("تنبيه", "يجب السماح بالوصول للصور لاستخدام طبيب النباتات.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        Alert.alert("تنبيه", "تعذر الحصول على بيانات الصورة. جرّب صورة أخرى.");
        return;
      }
      setSelectedImageBase64(asset.base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر رفع الصورة.");
    }
  }

  function normalizeAdd(product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    imageUrl?: string | null;
    maxQuantity?: number | null;
    category?: string | null;
  }) {
    addItem({
      productId: product.id,
      name: product.name,
      nameAr: product.name,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      quantity: 1,
      maxQuantity:
        product.maxQuantity != null && product.maxQuantity >= 0
          ? product.maxQuantity
          : undefined,
      category: product.category ?? null,
    });
    Alert.alert("تم", "تمت الإضافة للسلة.", [{ text: "حسناً" }]);
  }

  async function handleAdd(rec: AiRecommendation) {
    const product = rec.matched_product ?? rec.alternative_product;
    if (!product) return;
    normalizeAdd({
      id: product.id,
      name: product.name_ar ?? rec.requested_name,
      price: product.selling_price ?? 0,
      currency: product.currency ?? "QAR",
      imageUrl: product.image_url,
      maxQuantity: product.quantity,
      category: product.category ?? null,
    });
  }

  async function handleRequest(rec: AiRecommendation) {
    await requestUnavailableProduct(rec.requested_name, rec.reason);
    Alert.alert("تم", "تم إرسال طلبك بأقرب بديل متاح.", [{ text: "حسناً" }]);
  }

  async function submitDoctor() {
    setError(null);
    if (!selectedImageBase64 && symptoms.trim().length === 0) {
      Alert.alert("تنبيه", "أرسل صورة للنبات أو اكتب الأعراض بالتفصيل.");
      return;
    }

    setLoading(true);
    try {
      const payload: InvokeAiPayload = {
        message:
          symptoms.trim() ||
          "أرجو تشخيص حالة النبات من الصورة واقتراح علاج مناسب لجو قطر.",
        mode: "doctor",
        preferences: { plant_nature: pref },
        image: selectedImageBase64
          ? { base64: selectedImageBase64, mediaType: "image/jpeg" }
          : undefined,
      };

      const res = await invokeMalyanAi(payload);
      setDiagnosis(res.diagnosis || res.reply);
      setMaintenance(res.maintenancePlan);
      setRecommendations(res.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التشخيص الآن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "طبيب النباتات الذكي" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </Pressable>
            <MalyanLogo size="sm" />
          </View>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <Text style={styles.title}>📸 تشخيص سريع للنباتات</Text>
          <Text style={styles.sub}>
            أرسل صورة الأوراق أو الجذع وسنقترح تشخيصًا وعلاجًا وخطة صيانة، مع منتجات مناسبة من مليان.
          </Text>

          <View style={styles.sectionCard}>
            <Text style={styles.label}>صورة (اختياري لكن الأفضل)</Text>
            <View style={styles.photoRow}>
              <Pressable style={styles.photoBtn} onPress={() => void pickImage()}>
                <Ionicons name="image-outline" size={20} color={colors.gold} />
                <Text style={styles.photoBtnText}>اختيار صورة</Text>
              </Pressable>
              {selectedImageBase64 ? (
                <Pressable
                  style={styles.clearPhotoBtn}
                  onPress={() => setSelectedImageBase64(null)}
                >
                  <Ionicons name="close" size={18} color={colors.red400} />
                  <Text style={styles.clearPhotoText}>إزالة</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.label}>الأعراض (اختياري)</Text>
            <TextInput
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder="مثال: اصفرار الأوراق، بقع بنية، ذبول…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.label}>تفضيل النباتات</Text>
            <View style={styles.pillsRow}>
              {(
                [
                  { id: "natural", label: "طبيعي" },
                  { id: "mixed", label: "مختلط" },
                  { id: "artificial", label: "صناعي" },
                ] as const
              ).map((p) => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    styles.pill,
                    pref === p.id && styles.pillOn,
                    pressed && { opacity: 0.92 },
                  ]}
                  onPress={() => setPref(p.id)}
                >
                  <Text style={styles.pillText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.92 }]}
            onPress={() => void submitDoctor()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Ionicons name="medical" size={18} color={colors.bg} />
            )}
            <Text style={styles.submitBtnText}>
              {loading ? "جارٍ التشخيص…" : "تشخيص"}
            </Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {diagnosis ? (
            <View style={styles.sectionCard}>
              <Text style={styles.resultTitle}>التشخيص</Text>
              <Text style={styles.resultBody}>{diagnosis}</Text>
            </View>
          ) : null}

          {maintenance.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.resultTitle}>خطة العلاج والصيانة</Text>
              {maintenance.map((s, i) => (
                <Text key={`${s}-${i}`} style={styles.planItem}>
                  • {s}
                </Text>
              ))}
            </View>
          ) : null}

          {recommendations.length > 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.resultTitle}>منتجات مناسبة من مليان</Text>
              {recommendations.map((rec, idx) => {
                const product = rec.matched_product ?? rec.alternative_product;
                return (
                  <View key={`${rec.requested_name}-${idx}`} style={styles.recCard}>
                    <Text style={styles.recTitle}>
                      {product?.name_ar ?? rec.requested_name}
                    </Text>
                    <Text style={styles.recReason}>{rec.reason}</Text>
                    <View style={styles.recActions}>
                      {product ? (
                        <Pressable
                          style={({ pressed }) => [styles.recBtn, styles.recBtnAdd, pressed && { opacity: 0.92 }]}
                          onPress={() => void handleAdd(rec)}
                        >
                          <Ionicons name="add" size={18} color={colors.bg} />
                          <Text style={styles.recBtnText}>أضف للسلة</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={({ pressed }) => [styles.recBtn, styles.recBtnRequest, pressed && { opacity: 0.92 }]}
                          onPress={() => void handleRequest(rec)}
                        >
                          <Ionicons name="help-circle-outline" size={18} color={colors.gold} />
                          <Text style={[styles.recBtnText, { color: colors.gold }]}>اطلب</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* keep bottom safe area */}
          <View style={{ height: 1 }} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 50 },
  title: { color: colors.white, fontWeight: "900", fontSize: 18, textAlign: "right", marginBottom: 6 },
  sub: { color: colors.textSecondary, lineHeight: 22, fontSize: 13, marginBottom: spacing.lg, textAlign: "right" },
  sectionCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg, marginBottom: spacing.md },
  label: { color: colors.textMuted, fontWeight: "900", fontSize: 13, marginBottom: 10, textAlign: "right" },
  photoRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  photoBtnText: { color: colors.gold, fontWeight: "900" },
  clearPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.red400, backgroundColor: "rgba(248,113,113,0.12)" },
  clearPhotoText: { color: colors.red400, fontWeight: "900" },
  input: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 12, color: colors.white, textAlign: "right", fontSize: 15, minHeight: 90 },
  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  pillOn: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  pillText: { color: colors.white, fontWeight: "900", fontSize: 13 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: radii.xl, backgroundColor: colors.brand, borderWidth: 1, borderColor: colors.brand, marginBottom: spacing.md },
  submitBtnText: { color: colors.bg, fontWeight: "900", fontSize: 16 },
  errorText: { color: colors.red400, fontWeight: "900", textAlign: "right", marginBottom: spacing.md },
  resultTitle: { color: colors.gold, fontWeight: "900", fontSize: 14, textAlign: "right", marginBottom: 8 },
  resultBody: { color: colors.white, fontSize: 13, lineHeight: 22, textAlign: "right" },
  planItem: { color: colors.textSecondary, fontSize: 13, lineHeight: 22, textAlign: "right", marginTop: 6 },
  recCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.bgElevated, padding: 12, marginBottom: 10 },
  recTitle: { color: colors.white, fontWeight: "900", fontSize: 14, marginBottom: 6, textAlign: "right" },
  recReason: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: "right", marginBottom: 10 },
  recActions: { flexDirection: "row-reverse", gap: 10 },
  recBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1 },
  recBtnAdd: { backgroundColor: colors.brand, borderColor: colors.brand },
  recBtnRequest: { backgroundColor: "transparent", borderColor: colors.goldMuted },
  recBtnText: { fontWeight: "900", color: colors.bg },
});

