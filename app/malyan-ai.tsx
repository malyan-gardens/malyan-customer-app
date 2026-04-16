import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  getLatestConversation,
  getTodayAiUsage,
  invokeMalyanAi,
  requestUnavailableProduct,
  type AiRecommendation,
  type AiUsage,
  type ChatUiMessage,
} from "../lib/malyan-ai";

type Pref = "natural" | "artificial" | "mixed";

function TypingDots() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const d1 = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const d2 = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const d3 = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={styles.typingWrap}>
      <Animated.View style={[styles.typingDot, { opacity: d1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: d2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: d3 }]} />
    </View>
  );
}

function RecommendationRow({
  rec,
  onAdd,
  onRequest,
}: {
  rec: AiRecommendation;
  onAdd: (productId: string, params: { name: string; price: number; currency: string; imageUrl?: string | null; maxQuantity?: number | null }) => void;
  onRequest: () => Promise<void>;
}) {
  const matched = rec.matched_product;
  const alternative = rec.alternative_product;
  const product = matched ?? alternative;
  const isAlternative = !matched && Boolean(alternative);

  return (
    <View style={styles.recCard}>
      <View style={styles.recTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recTitle} numberOfLines={2}>
            {product?.name_ar ?? rec.requested_name}
          </Text>
          <Text style={styles.recSub}>
            {rec.reason}
          </Text>
        </View>
        <View style={styles.recBadges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {rec.product_type === "natural"
                ? "طبيعي"
                : rec.product_type === "artificial"
                  ? "صناعي"
                  : "مختلط"}
            </Text>
          </View>
          {isAlternative ? (
            <View style={[styles.badge, styles.badgeAlt]}>
              <Text style={styles.badgeText}>بديل متاح</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.recActions}>
        {product ? (
          <Pressable
            style={({ pressed }) => [
              styles.recBtn,
              pressed && { opacity: 0.92 },
              styles.recBtnAdd,
            ]}
            onPress={() => {
              onAdd(product.id, {
                name: product.name_ar ?? rec.requested_name,
                price: product.selling_price ?? 0,
                currency: product.currency ?? "QAR",
                imageUrl: product.image_url,
                maxQuantity: product.quantity,
              });
            }}
          >
            <Ionicons name="add" size={18} color={colors.bg} />
            <Text style={styles.recBtnText}>أضف للسلة</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.recBtn,
              pressed && { opacity: 0.92 },
              styles.recBtnRequest,
            ]}
            onPress={async () => {
              await onRequest();
            }}
          >
            <Ionicons name="help-circle-outline" size={18} color={colors.gold} />
            <Text style={[styles.recBtnText, { color: colors.gold }]}>
              اطلب هذا المنتج
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function MalyanAiScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [pref, setPref] = useState<Pref>("mixed");
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);

  const [usage, setUsage] = useState<AiUsage | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const remainingLabel = useMemo(() => {
    if (!usage) return null;
    if (usage.remaining_messages <= 0) return "تبقى لك 0 رسالة اليوم";
    return `تبقى لك ${usage.remaining_messages} رسالة اليوم`;
  }, [usage]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const latest = await getLatestConversation("chat");
        if (!mounted) return;
        if (latest) {
          setConversationId(latest.id);
          setMessages(latest.messages as ChatUiMessage[]);
        }
        const todayUsage = await getTodayAiUsage();
        if (mounted) setUsage(todayUsage as AiUsage | null);
      } catch (_e) {
        // If usage load fails, chat still works.
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, typing]);

  async function pickImage() {
    setError(null);
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("تنبيه", "يجب السماح بالوصول للصور لاستخدام التشخيص الذكي.");
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

  async function handleAddToCart(productId: string, params: { name: string; price: number; currency: string; imageUrl?: string | null; maxQuantity?: number | null }) {
    addItem({
      productId,
      name: params.name,
      nameAr: params.name,
      price: params.price,
      currency: params.currency,
      imageUrl: params.imageUrl,
      quantity: 1,
      maxQuantity: params.maxQuantity != null && params.maxQuantity >= 0 ? params.maxQuantity : undefined,
    });
    Alert.alert("تم", "تمت إضافة المنتج للسلة بنجاح.", [{ text: "حسناً" }]);
  }

  async function handleRequest(rec: AiRecommendation) {
    await requestUnavailableProduct(rec.requested_name, rec.reason);
    Alert.alert("تم", "تم إرسال طلبك وسنخبرك بأقرب بديل متاح.", [{ text: "حسناً" }]);
  }

  async function sendMessage() {
    setError(null);

    const text = input.trim();
    const canSendImageOnly = Boolean(selectedImageBase64) && text.length === 0;

    const message =
      text ||
      (canSendImageOnly
        ? "أرجو تحليل الصورة واقتراح أفضل حلول للعناية/التنسيق داخل مناخ قطر."
        : "");

    if (!message) {
      Alert.alert("تنبيه", "اكتب سؤالك أو أرسل صورة للتشخيص الذكي.");
      return;
    }

    // Snapshot history without mutating state mid-flight.
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.createdAt,
    }));

    const userMsg: ChatUiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const res = await invokeMalyanAi({
        message,
        conversationId: conversationId || undefined,
        history,
        mode: "chat",
        preferences: { plant_nature: pref },
        image: selectedImageBase64
          ? {
              base64: selectedImageBase64,
              mediaType: "image/jpeg",
            }
          : undefined,
      });

      setConversationId(res.conversationId);

      const assistantMsg: ChatUiMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        createdAt: new Date().toISOString(),
        recommendations: res.recommendations,
        usage: res.usage ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.usage) setUsage(res.usage);
      setSelectedImageBase64(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذر إكمال الطلب.";
      setError(msg);

      // Friendly handling for daily block errors.
      if (msg.includes("DAILY_MESSAGES_EXCEEDED")) {
        Alert.alert("وصلت للحد اليومي", "تبقى لك 0 رسالة اليوم. جرّب لاحقاً.");
      } else if (msg.includes("DAILY_BUDGET_EXCEEDED")) {
        Alert.alert("وصلت للميزانية", "تعذر إكمال الطلب اليوم. جرّب لاحقاً.");
      }
    } finally {
      setTyping(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "مليان الذكي" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </Pressable>
            <MalyanLogo size="sm" />
          </View>

          <View style={{ alignItems: "flex-end" }}>
            {remainingLabel ? (
              <Text style={styles.remainingText}>{remainingLabel}</Text>
            ) : (
              <Text style={styles.remainingText}>جاري تحميل الاستخدام…</Text>
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>

        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>تفضيلك:</Text>
          <View style={styles.prefPills}>
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
                  styles.prefPill,
                  pref === p.id && styles.prefPillOn,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => setPref(p.id)}
              >
                <Text style={styles.prefPillText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatPad}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <LinearGradient colors={[colors.surface, colors.bgElevated]} style={styles.emptyCard}>
                <Ionicons name="sparkles" size={34} color={colors.gold} />
                <Text style={styles.emptyTitle}>اسأل مليان الذكي…</Text>
                <Text style={styles.emptySub}>
                  وصف المساحة أو أرسل صورة وسنقترح حلول نباتات وديكور مناسبة لجو قطر.
                </Text>
              </LinearGradient>
            </View>
          ) : null}

          {messages.map((m) => (
            <View key={m.id} style={m.role === "user" ? styles.userRow : styles.aiRow}>
              <View
                style={[
                  styles.bubble,
                  m.role === "user" ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text style={m.role === "user" ? styles.bubbleUserText : styles.bubbleAiText}>
                  {m.content}
                </Text>

                {m.role === "assistant" && m.recommendations && m.recommendations.length > 0 ? (
                  <View style={styles.recWrap}>
                    <Text style={styles.recHeader}>توصيات المنتجات</Text>
                    {m.recommendations.map((rec, idx) => (
                      <RecommendationRow
                        key={`${rec.requested_name}-${idx}`}
                        rec={rec}
                        onAdd={(productId, params) => void handleAddToCart(productId, params)}
                        onRequest={() => handleRequest(rec)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          {typing ? (
            <View style={styles.aiRow}>
              <View style={[styles.bubble, styles.bubbleAi]}>
                <TypingDots />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.inputArea}
        >
          <View style={styles.inputTopRow}>
            <Pressable style={styles.photoBtn} onPress={() => void pickImage()}>
              <Ionicons name="image-outline" size={20} color={colors.gold} />
              <Text style={styles.photoBtnText}>صورة</Text>
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

          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="اكتب سؤالك…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && { opacity: 0.92 },
                typing && { opacity: 0.6 },
              ]}
              onPress={() => void sendMessage()}
              disabled={typing}
            >
              {typing ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Ionicons name="send" size={18} color={colors.bg} />
              )}
            </Pressable>
          </View>

          <Text style={styles.helpText}>
            {pref === "natural"
              ? "نقترح نباتات طبيعية قدر الإمكان."
              : pref === "artificial"
                ? "نقترح نباتات صناعية مناسبة للعناية السهلة."
                : "نقترح حلول طبيعية/صناعية بحسب الأفضل لمساحتك."}
          </Text>

          {/* Spacer for iOS input */}
          <View style={{ height: 10 }} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  remainingText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 13,
    textAlign: "right",
  },
  errorText: {
    color: colors.red400,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 6,
  },
  prefRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prefLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 13 },
  prefPills: { flexDirection: "row", gap: 8, alignItems: "center" },
  prefPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  prefPillOn: {
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
  },
  prefPillText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  chatScroll: { flex: 1 },
  chatPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 10 },
  emptyWrap: { paddingTop: 30 },
  emptyCard: { padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 10 },
  emptyTitle: { color: colors.white, fontWeight: "900", fontSize: 20, textAlign: "center" },
  emptySub: { color: colors.textSecondary, textAlign: "center", lineHeight: 22, fontSize: 13, marginTop: 4 },
  userRow: { flexDirection: "row-reverse", justifyContent: "flex-start", marginBottom: 14 },
  aiRow: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 14 },
  bubble: {
    maxWidth: "92%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  bubbleUser: { backgroundColor: "rgba(26,122,60,0.18)", borderColor: colors.brandMutedBg },
  bubbleAi: { backgroundColor: colors.surface, borderColor: colors.border },
  bubbleUserText: { color: colors.white, fontWeight: "700", lineHeight: 22, textAlign: "right" },
  bubbleAiText: { color: colors.white, fontWeight: "600", lineHeight: 22, textAlign: "right" },
  recWrap: { marginTop: spacing.md },
  recHeader: { color: colors.gold, fontWeight: "900", fontSize: 13, marginBottom: 10 },
  recCard: { padding: 12, backgroundColor: colors.bgElevated, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 10, gap: 10 },
  recTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  recTitle: { color: colors.white, fontWeight: "900", fontSize: 14, maxWidth: 220 },
  recSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: "right" },
  recBadges: { gap: 6, alignItems: "flex-end" },
  badge: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeAlt: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  badgeText: { color: colors.gold, fontWeight: "900", fontSize: 11 },
  recActions: { flexDirection: "row-reverse", justifyContent: "flex-start", gap: 10 },
  recBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radii.md, borderWidth: 1 },
  recBtnAdd: { backgroundColor: colors.brand, borderColor: colors.brand },
  recBtnRequest: { backgroundColor: "transparent", borderColor: colors.goldMuted },
  recBtnText: { fontWeight: "900", color: colors.bg },
  typingWrap: { flexDirection: "row", gap: 8, alignItems: "center" },
  typingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  inputTopRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  photoBtnText: { color: colors.gold, fontWeight: "900", fontSize: 13 },
  clearPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.red400, backgroundColor: "rgba(248,113,113,0.12)" },
  clearPhotoText: { color: colors.red400, fontWeight: "900", fontSize: 13 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.white,
    minHeight: 46,
    textAlign: "right",
    fontSize: 15,
    lineHeight: 20,
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldMuted,
    ...shadows.goldGlow,
  },
  helpText: { color: colors.textMuted, marginTop: 8, textAlign: "right", fontSize: 12, lineHeight: 18 },
});

