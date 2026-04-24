import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  ListRenderItem,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GuestModal } from "../../components/GuestModal";
import { MalyanLogo } from "../../components/MalyanLogo";
import { getActivePromotions, heroPromotionBadge } from "../../lib/promotions";
import { supabase } from "../../lib/supabase";
import { colors, radii, shadows, spacing } from "../../lib/theme";
import { getProductImageUrls, shuffleArray } from "../../lib/catalogUi";
import type { InventoryRow, ProductTypeRow } from "../../lib/types";
import { useAuthStore } from "../../lib/authStore";
import { useCartStore } from "../../store/cartStore";

const GRID_GAP = 12;
const GRID_H_PAD = spacing.md;
const PRODUCT_COLUMNS = 2;
const PRODUCT_IMAGE_H = 120;
const BANNER_H = 220;
type BannerSlide = {
  key: string;
  title: string;
  sub: string;
  typeBadge?: string | null;
  endDate?: string | null;
  colors: readonly [string, string, string];
};

const DEFAULT_BANNERS: BannerSlide[] = [
  {
    key: "d1",
    title: "🌿 نباتات صناعية فاخرة",
    sub: "أجمل النباتات لمنزلك ومكتبك",
    endDate: null,
    colors: ["#145e2f", "#1a7a3c", "#0a0a0a"] as const,
  },
  {
    key: "d2",
    title: "🔧 خدمات صيانة متخصصة",
    sub: "فريق متخصص لصيانة حدائقك",
    endDate: null,
    colors: ["#063015", "#1a7a3c", "#111"] as const,
  },
  {
    key: "d3",
    title: "🎨 تصميم مساحات خضراء",
    sub: "نحول مساحتك لجنة خضراء",
    endDate: null,
    colors: ["#1a7a3c", "#c9a84c33", "#0a0a0a"] as const,
  },
];

const CATEGORIES = [
  { key: "plants", emoji: "🌿", label: "المنتجات", href: "/plants" as const },
  { key: "maint", emoji: "🔧", label: "الصيانة", href: "/maintenance" as const },
  { key: "design", emoji: "🎨", label: "تصميم المساحات", href: "/design" as const },
  { key: "offers", emoji: "⭐", label: "العروض", href: "/plants" as const },
];

const QUICK_STATS = [
  { key: "s1", label: "توصيل سريع 🚚" },
  { key: "s2", label: "ضمان الجودة ⭐" },
  { key: "s3", label: "دعم 24/7 💬" },
];

const BRAND_BORDER_44 = `${colors.brand}44`;

function ProductTypeIcon({ icon, size }: { icon: string | null; size: number }) {
  const raw = (icon ?? "").trim();
  if (/^https?:\/\//i.test(raw)) {
    return (
      <Image
        source={{ uri: raw }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  const ionName = raw.length > 0 && /^[a-z0-9-]+$/i.test(raw) ? raw : "leaf";
  return <Ionicons name={ionName as never} size={size} color={colors.gold} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const session = useAuthStore((s) => s.session);
  const isGuest = useAuthStore((s) => s.isGuest);
  const addItem = useCartStore((s) => s.addItem);
  const cartItemCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [typeProducts, setTypeProducts] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<BannerSlide[]>([]);
  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<ScrollView>(null);
  const colWidth =
    (screenWidth - GRID_H_PAD * 2 - GRID_GAP * (PRODUCT_COLUMNS - 1)) /
    PRODUCT_COLUMNS;
  const typeColWidth = colWidth;
  const heroWidth = screenWidth;

  const loadTypesAndPromos = useCallback(async () => {
    setError(null);
    const { data: typesData, error: typesErr } = await supabase
      .from("product_types")
      .select("id, name_ar, icon")
      .order("name_ar", { ascending: true });

    if (typesErr) {
      setError(typesErr.message);
      setProductTypes([]);
    } else {
      setProductTypes((typesData as ProductTypeRow[]) ?? []);
    }

    const promoList = await getActivePromotions();
    const mapped = promoList.map((p, i) => ({
      key: p.id,
      title: p.title?.trim() || `عرض خاص ${i + 1}`,
      sub: p.description?.trim() || "استفد من أحدث عروض مليان للحدائق",
      typeBadge: heroPromotionBadge(p),
      endDate: p.end_date ?? null,
      colors: ["#145e2f", "#1a7a3c", "#0a0a0a"] as const,
    }));
    setPromotions(mapped);

    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadProductsForType = useCallback(async (typeId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingProducts(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("inventory")
      .select("*")
      .eq("product_type_id", typeId)
      .gt("quantity", 0);
    if (qErr) {
      setError(qErr.message);
      setTypeProducts([]);
    } else {
      setTypeProducts(shuffleArray((data as InventoryRow[]) ?? []));
    }
    if (!opts?.silent) setLoadingProducts(false);
  }, []);

  useEffect(() => {
    void loadTypesAndPromos();
  }, [loadTypesAndPromos]);

  useEffect(() => {
    if (!selectedTypeId) {
      setTypeProducts([]);
      return;
    }
    void loadProductsForType(selectedTypeId);
  }, [selectedTypeId, loadProductsForType]);

  const bannerSlides = promotions.length > 0 ? promotions : DEFAULT_BANNERS;

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const t = setInterval(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % bannerSlides.length;
        heroRef.current?.scrollTo({ x: next * heroWidth, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [bannerSlides.length, heroWidth]);

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productTypes;
    return productTypes.filter((t) => (t.name_ar ?? "").toLowerCase().includes(q));
  }, [productTypes, search]);

  const filteredTypeProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = typeProducts;
    if (q) {
      list = typeProducts.filter((row) => {
        const name = (row.name_ar ?? "").toLowerCase();
        const desc = (row.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    return list;
  }, [typeProducts, search]);

  const selectedTypeLabel = useMemo(() => {
    if (!selectedTypeId) return "";
    return productTypes.find((t) => t.id === selectedTypeId)?.name_ar ?? "المنتجات";
  }, [productTypes, selectedTypeId]);

  const renderProduct: ListRenderItem<InventoryRow> = useCallback(
    ({ item }) => {
      const title = item.name_ar ?? "";
      const price = (item.selling_price ?? 0).toFixed(2);
      const maxQ = item.quantity;
      const isOutOfStock = (item.quantity ?? 0) === 0;
      const images = getProductImageUrls(item);
      return (
        <View style={[styles.gridCell, { width: colWidth }]}>
          <View style={styles.pCard}>
            <Pressable
              onPress={() => router.push(`/product/${item.id}`)}
              style={({ pressed }) => [styles.pCardPress, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.pImageWrap}>
                {images.length > 0 ? (
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                    {images.map((img, idx) => (
                      <Image
                        key={`${img}-${idx}`}
                        source={{ uri: img }}
                        style={[styles.pImage, { width: colWidth }]}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <LinearGradient
                    colors={[colors.surface, colors.bgElevated]}
                    style={styles.pImagePlaceholder}
                  >
                    <Ionicons name="leaf" size={40} color={colors.brand} />
                  </LinearGradient>
                )}
                {isOutOfStock ? (
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockBadgeText}>نفدت الكمية</Text>
                  </View>
                ) : null}
                {images.length > 1 ? (
                  <View style={styles.imageCountBadge}>
                    <Text style={styles.imageCountBadgeText}>{images.length} صور</Text>
                  </View>
                ) : null}
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
                if (isOutOfStock) return;
                if (isGuest) {
                  setShowGuestModal(true);
                  return;
                }
                addItem({
                  productId: item.id,
                  name: title,
                  nameAr: item.name_ar,
                  price: item.selling_price ?? 0,
                  currency: item.currency ?? "QAR",
                  imageUrl: item.image_url,
                  quantity: 1,
                  maxQuantity: maxQ != null && maxQ >= 0 ? maxQ : undefined,
                  category: item.category ?? null,
                });
              }}
              disabled={isOutOfStock}
              style={({ pressed }) => [
                styles.addMini,
                (pressed || isOutOfStock) && { opacity: 0.9 },
                isOutOfStock && styles.btnDisabled,
              ]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addMiniText}>{isOutOfStock ? "غير متاح" : "أضف للسلة"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isOutOfStock) return;
                if (isGuest) {
                  setShowGuestModal(true);
                  return;
                }
                router.push({
                  pathname: "/checkout",
                  params: {
                    productId: item.id,
                    productName: title,
                    productPrice: String(item.selling_price ?? 0),
                    productCurrency: item.currency ?? "QAR",
                  },
                });
              }}
              disabled={isOutOfStock}
              style={({ pressed }) => [
                styles.buyNowBtn,
                (pressed || isOutOfStock) && { opacity: 0.9 },
                isOutOfStock && styles.btnDisabled,
              ]}
            >
              <Ionicons name="flash" size={16} color={colors.bg} />
              <Text style={styles.buyNowText}>{isOutOfStock ? "غير متاح" : "اطلب الآن"}</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [addItem, colWidth, isGuest, router]
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <Text style={styles.footerLine1}>مليان للتجارة والحدائق</Text>
        <Text style={styles.footerLine2}>الدوحة، قطر 🇶🇦</Text>
        <View style={styles.socialRow}>
          <Pressable
            onPress={() => void Linking.openURL("https://instagram.com/malyan.tg")}
          >
            <Ionicons name="logo-instagram" size={28} color="#E1306C" />
          </Pressable>
          <Pressable onPress={() => void Linking.openURL("https://wa.me/97400000000")}>
            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          </Pressable>
          <Pressable
            onPress={() => void Linking.openURL("https://facebook.com/Malyanlandscape")}
          >
            <Ionicons name="logo-facebook" size={28} color="#1877F2" />
          </Pressable>
        </View>
        <Text style={styles.footerCopy}>
          © 2025 مليان للحدائق. جميع الحقوق محفوظة
        </Text>
      </View>
    ),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>جاري التحميل…</Text>
      </SafeAreaView>
    );
  }

  const typesBrowseHeader = (
    <>
      <View style={styles.heroWrap}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / heroWidth);
            if (i >= 0 && i < bannerSlides.length) setHeroIndex(i);
          }}
          decelerationRate="fast"
          ref={heroRef}
        >
          {bannerSlides.map((slide) => (
            <LinearGradient
              key={slide.key}
              colors={[...slide.colors]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroSlide, { width: heroWidth }]}
            >
              <Text style={styles.heroTitle}>{slide.title}</Text>
              <Text style={styles.heroSub}>{slide.sub}</Text>
              {slide.typeBadge ? (
                <View style={styles.heroTypeBadge}>
                  <Text style={styles.heroTypeBadgeText}>{slide.typeBadge}</Text>
                </View>
              ) : null}
              {slide.endDate ? (
                <Text style={styles.heroEndDate}>ينتهي في: {slide.endDate}</Text>
              ) : null}
              <Pressable
                onPress={() => {
                  setSelectedTypeId(null);
                  setSearch("");
                }}
                style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.heroCtaText}>اكتشف الآن</Text>
              </Pressable>
            </LinearGradient>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {bannerSlides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === heroIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScroll}
      >
        {QUICK_STATS.map((s) => (
          <View key={s.key} style={styles.statPill}>
            <Text style={styles.statPillText}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.searchRow}>
        <Pressable style={styles.filterBtn} onPress={() => router.push("/plants")}>
          <Ionicons name="options-outline" size={22} color={colors.gold} />
        </Pressable>
        <View style={styles.searchInner}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن نوع…"
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
            style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          >
            <LinearGradient
              colors={[colors.surface, colors.bgElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.catCard}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={styles.catLabel}>{c.label}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => {
          if (isGuest) {
            setShowGuestModal(true);
            return;
          }
          if (session) {
            router.push("/malyan-ai" as never);
          }
        }}
        style={({ pressed }) => [styles.aiBanner, pressed && { opacity: 0.95 }]}
      >
        <LinearGradient
          colors={["#0d3d22", "#1a7a3c", "#063015"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBannerGrad}
        >
          <Ionicons name="sparkles" size={32} color={colors.gold} />
          <View style={styles.aiBannerTextWrap}>
            <Text style={styles.aiBannerTitle}>مليان الذكي 🤖</Text>
            <Text style={styles.aiBannerSub}>استشر مساعدنا في النباتات والتصميم</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.gold} />
        </LinearGradient>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>أنواع المنتجات</Text>
        <Pressable onPress={() => router.push("/plants")}>
          <Text style={styles.seeAll}>الكل</Text>
        </Pressable>
      </View>
    </>
  );

  const productsListHeader = (
    <>
      <View style={styles.searchRow}>
        <Pressable style={styles.filterBtn} onPress={() => router.push("/plants")}>
          <Ionicons name="options-outline" size={22} color={colors.gold} />
        </Pressable>
        <View style={styles.searchInner}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث في المنتجات…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          <Ionicons name="search" size={20} color={colors.textMuted} />
        </View>
      </View>
      <Pressable
        style={styles.typeBackRow}
        onPress={() => {
          setSelectedTypeId(null);
          setSearch("");
        }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.gold} />
        <Text style={styles.typeBackTitle} numberOfLines={1}>
          {selectedTypeLabel}
        </Text>
      </Pressable>
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <GuestModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onLogin={() => {
          setShowGuestModal(false);
          router.push("/login");
        }}
      />

      <View style={styles.topBar}>
        <View style={styles.topBarSide}>
          <Pressable style={styles.iconBtn} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.topBarCenter}>
          <MalyanLogo size="sm" />
        </View>
        <View style={[styles.topBarSide, styles.topBarSideEnd]}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/cart")}>
            <Ionicons name="cart-outline" size={22} color={colors.white} />
            {cartItemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItemCount > 99 ? "99+" : String(cartItemCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {!selectedTypeId ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.typesScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadTypesAndPromos();
              }}
              tintColor={colors.gold}
            />
          }
        >
          {typesBrowseHeader}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={styles.retry}
                onPress={() => {
                  setLoading(true);
                  void loadTypesAndPromos();
                }}
              >
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.typesGrid}>
              {filteredTypes.length === 0 ? (
                <Text style={styles.empty}>لا توجد أنواع مطابقة.</Text>
              ) : (
                filteredTypes.map((t) => (
                  <View key={t.id} style={[styles.typeGridCell, { width: typeColWidth }]}>
                    <Pressable
                      style={styles.typeCard}
                      onPress={() => {
                        setSearch("");
                        setSelectedTypeId(t.id);
                      }}
                    >
                      <ProductTypeIcon icon={t.icon} size={44} />
                      <Text style={styles.typeCardName} numberOfLines={2}>
                        {t.name_ar ?? "—"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          )}
          {listFooter}
        </ScrollView>
      ) : loadingProducts ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>جاري تحميل المنتجات…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTypeProducts}
          keyExtractor={(item) => item.id}
          numColumns={PRODUCT_COLUMNS}
          key={PRODUCT_COLUMNS}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void (async () => {
                  setRefreshing(true);
                  try {
                    if (selectedTypeId) {
                      await loadProductsForType(selectedTypeId, { silent: true });
                    }
                  } finally {
                    setRefreshing(false);
                  }
                })();
              }}
              tintColor={colors.gold}
            />
          }
          ListHeaderComponent={
            <>
              {productsListHeader}
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    style={styles.retry}
                    onPress={() => selectedTypeId && void loadProductsForType(selectedTypeId)}
                  >
                    <Text style={styles.retryText}>إعادة المحاولة</Text>
                  </Pressable>
                </View>
              ) : null}
              {!error && filteredTypeProducts.length === 0 ? (
                <Text style={styles.empty}>لا توجد منتجات في هذا النوع.</Text>
              ) : null}
            </>
          }
          ListFooterComponent={listFooter}
          renderItem={renderProduct}
        />
      )}
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
  topBarSide: { flex: 1, alignItems: "flex-start" },
  topBarSideEnd: { alignItems: "flex-end" },
  topBarCenter: { flex: 1, alignItems: "center" },
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
  cartBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  cartBadgeText: {
    color: colors.bg,
    fontSize: 11,
    fontWeight: "900",
  },
  heroWrap: { marginBottom: spacing.md },
  heroSlide: {
    height: BANNER_H,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "right",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    marginTop: 8,
    textAlign: "right",
    lineHeight: 22,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  heroTypeBadge: {
    alignSelf: "flex-end",
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  heroTypeBadgeText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "right",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  heroEndDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  heroCta: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  heroCtaText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 15,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.gold, width: 22 },
  statsScroll: {
    paddingHorizontal: spacing.md,
    gap: 10,
    paddingBottom: spacing.md,
    flexDirection: "row",
  },
  statPill: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BRAND_BORDER_44,
  },
  statPillText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
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
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
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
  catCard: {
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.borderBrandMuted,
    minWidth: 100,
    ...shadows.soft,
  },
  catEmoji: { fontSize: 22, textAlign: "right", marginBottom: 6 },
  catLabel: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  aiBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.goldMuted,
    ...shadows.card,
  },
  aiBannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  aiBannerTextWrap: { flex: 1 },
  aiBannerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  aiBannerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "right",
    marginTop: 6,
    lineHeight: 20,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: GRID_H_PAD,
    marginBottom: GRID_GAP,
    gap: GRID_GAP,
  },
  gridListContent: { paddingBottom: 120 },
  gridCell: {},
  pCard: {
    width: "100%",
    minHeight: PRODUCT_IMAGE_H + 96,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  pCardPress: { flex: 1 },
  pImageWrap: {
    height: PRODUCT_IMAGE_H,
    width: "100%",
    backgroundColor: colors.bgElevated,
    position: "relative",
  },
  imageCountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: colors.overlay,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  imageCountBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  stockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.red500,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  pImage: { width: "100%", height: "100%" },
  pImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    flexGrow: 1,
  },
  pTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
    minHeight: 40,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  pPrice: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 14,
    textAlign: "right",
    marginTop: 6,
  },
  addMini: {
    marginHorizontal: 10,
    marginBottom: 6,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  addMiniText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  buyNowBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.gold,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  buyNowText: { color: colors.bg, fontWeight: "800", fontSize: 12 },
  btnDisabled: { opacity: 0.5 },
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
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  footerLine1: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  footerLine2: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
  },
  footerCopy: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  typesScrollContent: { paddingBottom: 120 },
  typesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: GRID_H_PAD,
    gap: GRID_GAP,
  },
  typeGridCell: { marginBottom: GRID_GAP },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    ...shadows.soft,
  },
  typeCardName: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  typeBackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBackTitle: {
    flex: 1,
    color: colors.gold,
    fontWeight: "900",
    fontSize: 16,
    textAlign: "right",
  },
});
