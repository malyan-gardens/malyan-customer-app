import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ListRenderItem,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MalyanLogo } from "../../components/MalyanLogo";
import { colors, radii, shadows, spacing } from "../../lib/theme";
import type { InventoryRow } from "../../lib/types";
import { supabase } from "../../lib/supabase";
import { useCartStore } from "../../store/cartStore";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 12;
const GRID_H_PAD = spacing.md;
const COL_WIDTH = (SCREEN_W - GRID_H_PAD * 2 - GRID_GAP) / 2;
const PRODUCT_IMAGE_H = 180;

const HERO_W = SCREEN_W;
const HERO_SLIDES = [
  {
    key: "1",
    title: "أناقة دائمة",
    sub: "منتجات فاخرة بجودة عالية",
    colors: ["#145e2f", "#1a7a3c", "#0a0a0a"] as const,
  },
  {
    key: "2",
    title: "صيانة احترافية",
    sub: "نحافظ على مساحتك على مدار العام",
    colors: ["#063015", "#1a7a3c", "#111"] as const,
  },
  {
    key: "3",
    title: "تصميم يعكس ذوقك",
    sub: "مكاتب، فنادق، منازل وحدائق",
    colors: ["#1a7a3c", "#c9a84c33", "#0a0a0a"] as const,
  },
];

const CATEGORIES = [
  { key: "plants", emoji: "🌿", label: "المنتجات", href: "/plants" as const },
  { key: "maint", emoji: "🔧", label: "الصيانة", href: "/maintenance" as const },
  { key: "design", emoji: "🎨", label: "تصميم المساحات", href: "/design" as const },
  { key: "offers", emoji: "⭐", label: "العروض", href: "/plants" as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: qErr } = await supabase
      .from("inventory")
      .select("*")
      .order("name_ar", { ascending: true });

    if (qErr) {
      setError(qErr.message);
      setItems([]);
    } else {
      setItems((data as InventoryRow[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredFeatured = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter((row) => {
        const name = (row.name_ar ?? "").toLowerCase();
        const desc = (row.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    return list.slice(0, 12);
  }, [items, search]);

  const renderProduct: ListRenderItem<InventoryRow> = useCallback(
    ({ item }) => {
      const title = item.name_ar ?? "";
      const price = (item.selling_price ?? 0).toFixed(2);
      const maxQ = item.quantity;
      return (
        <View style={[styles.gridCell, { width: COL_WIDTH }]}>
          <View style={styles.pCard}>
            <Pressable
              onPress={() => router.push(`/product/${item.id}`)}
              style={({ pressed }) => [styles.pCardPress, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.pImageWrap}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.pImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.surface, colors.bgElevated]}
                    style={styles.pImagePlaceholder}
                  >
                    <Ionicons name="leaf" size={40} color={colors.brand} />
                  </LinearGradient>
                )}
              </View>
              <View style={styles.pBody}>
                <Text style={styles.pTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.pPrice}>
                  {price} {item.currency ?? "QAR"}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                addItem({
                  productId: item.id,
                  name: title,
                  nameAr: item.name_ar,
                  price: item.selling_price ?? 0,
                  currency: item.currency ?? "QAR",
                  imageUrl: item.image_url,
                  quantity: 1,
                  maxQuantity: maxQ != null && maxQ >= 0 ? maxQ : undefined,
                });
              }}
              style={({ pressed }) => [styles.addMini, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addMiniText}>أضف للسلة</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [addItem, router]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>جاري التحميل…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
        </Pressable>
        <MalyanLogo size="sm" />
        <Pressable style={styles.avatar} onPress={() => router.push("/(tabs)/profile")}>
          <Ionicons name="person" size={20} color={colors.gold} />
        </Pressable>
      </View>

      <FlatList
        data={filteredFeatured}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.gold}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.heroWrap}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const i = Math.round(e.nativeEvent.contentOffset.x / HERO_W);
                  if (i >= 0 && i < HERO_SLIDES.length) setHeroIndex(i);
                }}
                decelerationRate="fast"
              >
                {HERO_SLIDES.map((slide) => (
                  <LinearGradient
                    key={slide.key}
                    colors={[...slide.colors]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.heroSlide, { width: HERO_W }]}
                  >
                    <Text style={styles.heroTitle}>{slide.title}</Text>
                    <Text style={styles.heroSub}>{slide.sub}</Text>
                  </LinearGradient>
                ))}
              </ScrollView>
              <View style={styles.dots}>
                {HERO_SLIDES.map((s, i) => (
                  <View key={s.key} style={[styles.dot, i === heroIndex && styles.dotActive]} />
                ))}
              </View>
            </View>

            <View style={styles.searchRow}>
              <Pressable style={styles.filterBtn} onPress={() => router.push("/plants")}>
                <Ionicons name="options-outline" size={22} color={colors.gold} />
              </Pressable>
              <View style={styles.searchInner}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="بحث عن منتج…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                />
                <Ionicons name="search" size={20} color={colors.textMuted} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>التصنيفات</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => router.push(c.href)}
                  style={({ pressed }) => [styles.catChip, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <Text style={styles.catLabel}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>منتجات مميزة</Text>
              <Pressable onPress={() => router.push("/plants")}>
                <Text style={styles.seeAll}>الكل</Text>
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retry} onPress={() => { setLoading(true); load(); }}>
                  <Text style={styles.retryText}>إعادة المحاولة</Text>
                </Pressable>
              </View>
            ) : null}
            {!error && filteredFeatured.length === 0 ? (
              <Text style={styles.empty}>لا توجد منتجات مطابقة.</Text>
            ) : null}
          </>
        }
        renderItem={renderProduct}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: colors.textMuted, marginTop: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldMuted,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroWrap: { marginBottom: spacing.md },
  heroSlide: {
    height: 180,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "right",
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    marginTop: 8,
    textAlign: "right",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.gold, width: 22 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  searchInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: 10,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: "right",
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginTop: 8,
  },
  seeAll: { color: colors.gold, fontWeight: "700", fontSize: 15 },
  catScroll: {
    paddingHorizontal: spacing.md,
    gap: 12,
    paddingBottom: spacing.md,
    flexDirection: "row",
  },
  catChip: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
    ...shadows.card,
  },
  catEmoji: { fontSize: 22, textAlign: "right", marginBottom: 6 },
  catLabel: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: GRID_H_PAD,
    marginBottom: GRID_GAP,
    gap: GRID_GAP,
  },
  gridListContent: { paddingBottom: 100 },
  gridCell: {},
  pCard: {
    width: "100%",
    minHeight: PRODUCT_IMAGE_H + 132,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  pCardPress: { flex: 1 },
  pImageWrap: {
    height: PRODUCT_IMAGE_H,
    width: "100%",
    backgroundColor: colors.bgElevated,
  },
  pImage: { width: "100%", height: "100%" },
  pImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    flexGrow: 1,
  },
  pTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
    lineHeight: 20,
    minHeight: 40,
  },
  pPrice: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 15,
    textAlign: "right",
    marginTop: 6,
  },
  addMini: {
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  addMiniText: { color: colors.white, fontWeight: "800", fontSize: 14 },
  errorBox: {
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  retry: {
    marginTop: 16,
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  retryText: { color: colors.white, fontWeight: "700" },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 40,
    paddingHorizontal: spacing.md,
  },
});
