import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
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
  saveAiDesign,
  type AiRecommendation,
  type InvokeAiPayload,
} from "../lib/malyan-ai";

type Pref = "natural" | "artificial" | "mixed";
type PlaceType = "indoor" | "outdoor";
type StyleType = "modern" | "traditional" | "tropical";

function PrefPill({
  on,
  label,
  onPress,
}: {
  on: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        on && styles.pillOn,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

export default function AiDesignWizardScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [place, setPlace] = useState<PlaceType>("outdoor");
  const [pref, setPref] = useState<Pref>("mixed");
  const [style, setStyle] = useState<StyleType>("tropical");
  const [budget, setBudget] = useState<string>("");
  const [spaceSize, setSpaceSize] = useState<string>("");

  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [layout, setLayout] = useState<string>("");
  const [maintenancePlan, setMaintenancePlan] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [estimatedCostQar, setEstimatedCostQar] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [designTitle, setDesignTitle] = useState<string>("تصميم ذكي للمساحة");

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!reply) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [reply]);

  async function pickImage() {
    setError(null);
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("تنبيه", "يجب السماح بالوصول للصور لاستخدام التصميم بالذكاء الاصطناعي.");
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

  const preferences = useMemo(
    () => ({
      place_type: place,
      plant_nature: pref,
      budget: budget.trim() || null,
      space_size: spaceSize.trim() || null,
      style,
    }),
    [place, pref, budget, spaceSize, style]
  );

  async function submitDesign() {
    setError(null);
    setLoading(true);
    try {
      const prompt = `أحتاج تصميم مساحة${place === "indoor" ? " داخلية" : " خارجية"}.
التفضيل: ${pref}.
النمط: ${style}.
المساحة: ${spaceSize || "غير محدد"}.
الميزانية: ${budget || "غير محدد"}.
أريد اقتراح تخطيط + قائمة منتجات (طبيعي/صناعي حسب التفضيل).`;

      const payload: InvokeAiPayload = {
        message: prompt,
        mode: "design",
        preferences,
        image: selectedImageBase64
          ? { base64: selectedImageBase64, mediaType: "image/jpeg" }
          : undefined,
      };

      const res = await invokeMalyanAi(payload);
      setReply(res.reply);
      setLayout(res.layoutSuggestion);
      setMaintenancePlan(res.maintenancePlan);
      setRecommendations(res.recommendations);
      setEstimatedCostQar(res.estimatedProductsCostQar);
    } catch (e) {
      console.log("[ai-design-wizard] malyan-ai-chat error:", e);
      const rawMsg = e instanceof Error ? e.message : String(e);

      if (rawMsg.includes("ANTHROPIC_API_KEY") || rawMsg.includes("Missing server environment variables")) {
        setError("تعذر تشغيل مليان الذكي بسبب مشكلة في إعدادات خدمة الذكاء الاصطناعي. حاول مرة أخرى لاحقاً.");
      } else if (rawMsg.includes("ANTHROPIC_ERROR")) {
        setError("تعذر التواصل مع خدمة التحليل حالياً. حاول مرة أخرى لاحقاً.");
      } else if (rawMsg.includes("Unauthorized")) {
        setError("انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى ثم المحاولة.");
      } else if (rawMsg.includes("DAILY_MESSAGES_EXCEEDED") || rawMsg.includes("Daily message limit reached")) {
        setError("وصلت للحد اليومي للمحادثات. تبقى لك 0 رسالة اليوم. جرّب لاحقاً.");
      } else if (rawMsg.includes("DAILY_BUDGET_EXCEEDED") || rawMsg.includes("Daily budget limit reached")) {
        setError("وصلت للحد اليومي للميزانية. جرّب لاحقاً.");
      } else {
        // Keep original error message for easier debugging, but still Arabic-friendly.
        setError(rawMsg || "تعذر إنشاء التصميم. حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(productId: string, product: { name: string; price: number; currency: string; imageUrl?: string | null; maxQuantity?: number | null }) {
    addItem({
      productId,
      name: product.name,
      nameAr: product.name,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      quantity: 1,
      maxQuantity:
        product.maxQuantity != null && product.maxQuantity >= 0 ? product.maxQuantity : undefined,
    });
    Alert.alert("تم", "تمت إضافة المنتج للسلة.", [{ text: "حسناً" }]);
  }

  async function handleRequest(rec: AiRecommendation) {
    await requestUnavailableProduct(rec.requested_name, rec.reason);
    Alert.alert("تم", "تم إرسال طلبك لمدير المليان.", [{ text: "حسناً" }]);
  }

  async function handleSave() {
    if (!reply) return;
    try {
      await saveAiDesign(
        designTitle.trim() || "تصميم ذكي للمساحة",
        preferences,
        {
          reply,
          layout_suggestion: layout,
          maintenance_plan: maintenancePlan,
          recommendations,
          estimated_cost_qr: estimatedCostQar,
        }
      );
      Alert.alert("تم الحفظ", "تم حفظ التصميم في حسابك.", [{ text: "حسناً" }]);
      router.push("/ai-my-designs");
    } catch (e) {
      Alert.alert("تعذر الحفظ", e instanceof Error ? e.message : "حاول مرة أخرى.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "تصميم ذكي للمساحات" }} />
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
          <Text style={styles.title}>أسئلة سريعة لتصميم مساحة مناسبة لقطر 🌿</Text>

          <Text style={styles.label}>موقع المساحة</Text>
          <View style={styles.pillsRow}>
            <PrefPill on={place === "outdoor"} label="خارجية" onPress={() => setPlace("outdoor")} />
            <PrefPill on={place === "indoor"} label="داخلية" onPress={() => setPlace("indoor")} />
          </View>

          <Text style={styles.label}>تفضيل النباتات</Text>
          <View style={styles.pillsRow}>
            <PrefPill on={pref === "natural"} label="طبيعي" onPress={() => setPref("natural")} />
            <PrefPill on={pref === "mixed"} label="مختلط" onPress={() => setPref("mixed")} />
            <PrefPill on={pref === "artificial"} label="صناعي" onPress={() => setPref("artificial")} />
          </View>

          <Text style={styles.label}>الستايل</Text>
          <View style={styles.pillsRow}>
            <PrefPill on={style === "modern"} label="مودرن" onPress={() => setStyle("modern")} />
            <PrefPill on={style === "traditional"} label="تقليدي" onPress={() => setStyle("traditional")} />
            <PrefPill on={style === "tropical"} label="استوائي" onPress={() => setStyle("tropical")} />
          </View>

          <Text style={styles.label}>مساحة المساحة (متر)</Text>
          <TextInput
            value={spaceSize}
            onChangeText={setSpaceSize}
            placeholder="مثال: 6x4 أو 24 متر"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>الميزانية (تقريباً)</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="مثال: 3000-5000 QAR"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>صورة (اختياري)</Text>
          <View style={styles.photoRow}>
            <Pressable style={styles.photoBtn} onPress={() => void pickImage()}>
              <Ionicons name="image-outline" size={20} color={colors.gold} />
              <Text style={styles.photoBtnText}>اختيار صورة</Text>
            </Pressable>
            {selectedImageBase64 ? (
              <Pressable style={styles.clearPhotoBtn} onPress={() => setSelectedImageBase64(null)}>
                <Ionicons name="close" size={18} color={colors.red400} />
                <Text style={styles.clearPhotoText}>إزالة</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.92 },
              loading && { opacity: 0.7 },
            ]}
            onPress={() => void submitDesign()}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={colors.bg} /> : <Ionicons name="sparkles" size={18} color={colors.bg} />}
            <Text style={styles.submitBtnText}>{loading ? "جارٍ إنشاء التصميم…" : "إنشاء التصميم"}</Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {reply ? (
            <View style={styles.resultWrap}>
              <Text style={styles.resultTitle}>اقتراح التصميم</Text>
              <Text style={styles.replyText}>{reply}</Text>

              {layout ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>تخطيط وخطوات التنفيذ</Text>
                  <Text style={styles.sectionBody}>{layout}</Text>
                </View>
              ) : null}

              {maintenancePlan.length > 0 ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>جدول الصيانة</Text>
                  {maintenancePlan.map((s, i) => (
                    <Text key={`${s}-${i}`} style={styles.planItem}>
                      • {s}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeadRow}>
                  <Text style={styles.sectionTitle}>قائمة المنتجات</Text>
                  <Text style={styles.costText}>تقدير: {estimatedCostQar.toFixed(2)} QAR</Text>
                </View>

                {recommendations.length === 0 ? (
                  <Text style={styles.sectionBody}>لم يتم استخراج توصيات منتجات بعد.</Text>
                ) : (
                  recommendations.map((rec, idx) => {
                    const product = rec.matched_product ?? rec.alternative_product;
                    const isAlt = !rec.matched_product && Boolean(rec.alternative_product);
                    return (
                      <View key={`${rec.requested_name}-${idx}`} style={styles.recCard}>
                        <Text style={styles.recTitle}>{product?.name_ar ?? rec.requested_name}{isAlt ? " (بديل متاح)" : ""}</Text>
                        <Text style={styles.recReason}>{rec.reason}</Text>
                        <View style={styles.recActions}>
                          {product ? (
                            <Pressable
                              style={({ pressed }) => [styles.recBtn, styles.recBtnAdd, pressed && { opacity: 0.92 }]}
                              onPress={() =>
                                void handleAddToCart(product.id, {
                                  name: product.name_ar ?? rec.requested_name,
                                  price: product.selling_price ?? 0,
                                  currency: product.currency ?? "QAR",
                                  imageUrl: product.image_url,
                                  maxQuantity: product.quantity,
                                })
                              }
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
                              <Text style={[styles.recBtnText, { color: colors.gold }]}>اطلب هذا المنتج</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <Text style={styles.label}>اسم التصميم</Text>
              <TextInput
                value={designTitle}
                onChangeText={setDesignTitle}
                placeholder="مثال: تصميم حديقة منزلية"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Pressable style={styles.saveBtn} onPress={() => void handleSave()}>
                <Ionicons name="bookmark" size={18} color={colors.bg} />
                <Text style={styles.saveBtnText}>حفظ التصميم</Text>
              </Pressable>

              <Pressable style={styles.secondaryBtn} onPress={() => router.push("/ai-my-designs")}>
                <Ionicons name="folder-open" size={18} color={colors.gold} />
                <Text style={styles.secondaryBtnText}>عرض تصاميمي</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  pad: { padding: spacing.lg, paddingBottom: 40 },
  title: { color: colors.white, fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: spacing.md, lineHeight: 26 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "900", marginBottom: 8, textAlign: "right" },
  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: spacing.md },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillOn: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  pillText: { color: colors.white, fontWeight: "900", fontSize: 13 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 12, color: colors.white, textAlign: "right", fontSize: 15, marginBottom: spacing.md },
  photoRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: spacing.md },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  photoBtnText: { color: colors.gold, fontWeight: "900" },
  clearPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1, borderColor: colors.red400, backgroundColor: "rgba(248,113,113,0.12)" },
  clearPhotoText: { color: colors.red400, fontWeight: "900" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.brand,
  },
  submitBtnText: { color: colors.bg, fontWeight: "900", fontSize: 16 },
  errorText: { marginTop: 10, color: colors.red400, fontWeight: "900", textAlign: "right" },
  resultWrap: { marginTop: spacing.lg, gap: 12 },
  resultTitle: { color: colors.gold, fontWeight: "900", fontSize: 16, marginBottom: 4, textAlign: "right" },
  replyText: { color: colors.white, fontSize: 14, fontWeight: "600", lineHeight: 22, textAlign: "right" },
  sectionCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: 14, backgroundColor: colors.surface },
  sectionTitle: { color: colors.gold, fontWeight: "900", fontSize: 14, marginBottom: 10, textAlign: "right" },
  sectionBody: { color: colors.textSecondary, lineHeight: 22, textAlign: "right", fontSize: 13 },
  sectionHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  costText: { color: colors.gold, fontWeight: "900", fontSize: 13 },
  planItem: { color: colors.textSecondary, fontSize: 13, textAlign: "right", lineHeight: 22 },
  recCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 12, backgroundColor: colors.bgElevated, marginBottom: 10 },
  recTitle: { color: colors.white, fontWeight: "900", fontSize: 14, marginBottom: 4, textAlign: "right" },
  recReason: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 10, textAlign: "right" },
  recActions: { flexDirection: "row-reverse", gap: 10 },
  recBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1 },
  recBtnAdd: { backgroundColor: colors.brand, borderColor: colors.brand },
  recBtnRequest: { backgroundColor: "transparent", borderColor: colors.goldMuted },
  recBtnText: { color: colors.bg, fontWeight: "900" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: radii.xl, backgroundColor: colors.gold, borderWidth: 1, borderColor: colors.goldMuted },
  saveBtnText: { color: colors.bg, fontWeight: "900", fontSize: 16 },
  secondaryBtn: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 12, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.goldMuted, backgroundColor: "rgba(201,168,76,0.10)" },
  secondaryBtnText: { color: colors.gold, fontWeight: "900", fontSize: 15 },
});

