import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../lib/theme";
import { MalyanLogo } from "../components/MalyanLogo";
import { useCartStore } from "../store/cartStore";
import { listAiDesigns, type AiRecommendation } from "../lib/malyan-ai";

type SavedDesign = {
  id: string;
  title: string;
  preferences: Record<string, unknown>;
  proposal: Record<string, unknown>;
  created_at: string;
};

export default function AiMyDesignsScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasDesigns = designs.length > 0;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setError(null);
        const list = (await listAiDesigns()) as SavedDesign[];
        if (!mounted) return;
        setDesigns(list);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "تعذر تحميل التصاميم.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const formattedDate = useMemo(() => {
    return (iso: string) => {
      try {
        const d = new Date(iso);
        return d.toLocaleDateString("ar", { year: "numeric", month: "short", day: "2-digit" });
      } catch {
        return iso;
      }
    };
  }, []);

  async function addDesignRecommendationsToCart(design: SavedDesign) {
    const proposal = design.proposal as any;
    const recs: AiRecommendation[] = Array.isArray(proposal?.recommendations)
      ? (proposal.recommendations as AiRecommendation[])
      : [];

    if (recs.length === 0) {
      Alert.alert("معلومة", "لا توجد توصيات منتجات محفوظة في هذا التصميم.");
      return;
    }

    recs.forEach((rec) => {
      const product = rec.matched_product ?? rec.alternative_product;
      if (!product) return;
      addItem({
        productId: product.id,
        name: product.name_ar ?? rec.requested_name,
        nameAr: product.name_ar ?? rec.requested_name,
        price: product.selling_price ?? 0,
        currency: product.currency ?? "QAR",
        imageUrl: product.image_url,
        quantity: 1,
        maxQuantity:
          product.quantity != null && product.quantity >= 0 ? product.quantity : undefined,
      });
    });

    Alert.alert("تم", "تمت إضافة توصيات التصميم للسلة.");
  }

  return (
    <>
      <Stack.Screen options={{ title: "تصاميمي الذكية" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </Pressable>
            <MalyanLogo size="sm" />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          {loading ? (
            <Text style={styles.loadingText}>جاري التحميل…</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : !hasDesigns ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>لا توجد تصاميم محفوظة بعد</Text>
              <Text style={styles.emptySub}>
                أنشئ تصميمًا جديدًا عبر “تصميم ذكي للمساحات” ثم احفظه هنا.
              </Text>
              <Pressable style={styles.ctaBtn} onPress={() => router.push("/ai-design-wizard")}>
                <Text style={styles.ctaText}>ابدأ الآن</Text>
              </Pressable>
            </View>
          ) : null}

          {designs.map((d) => (
            <View key={d.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{d.title}</Text>
                <Text style={styles.cardMeta}>{formattedDate(d.created_at)}</Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.92 }]}
                  onPress={() => void addDesignRecommendationsToCart(d)}
                >
                  <Ionicons name="add" size={18} color={colors.bg} />
                  <Text style={styles.btnText}>أضف للسلة</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
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
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  loadingText: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontWeight: "900" },
  errorText: { color: colors.red400, textAlign: "center", marginTop: 40, fontWeight: "900" },
  emptyWrap: { marginTop: 40, alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { color: colors.white, fontWeight: "900", fontSize: 18, textAlign: "center" },
  emptySub: { color: colors.textSecondary, marginTop: 8, textAlign: "center", lineHeight: 22, fontSize: 13 },
  ctaBtn: { marginTop: 18, backgroundColor: colors.brand, borderRadius: radii.xl, paddingVertical: 14, paddingHorizontal: 20 },
  ctaText: { color: colors.bg, fontWeight: "900", fontSize: 15, textAlign: "center" },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  cardTitle: { color: colors.white, fontWeight: "900", fontSize: 15, textAlign: "right", flexShrink: 1 },
  cardMeta: { color: colors.textMuted, fontWeight: "800", marginTop: 6, fontSize: 12, textAlign: "right" },
  cardActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radii.lg, borderWidth: 1 },
  btnPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  btnText: { color: colors.bg, fontWeight: "900", fontSize: 13 },
});

