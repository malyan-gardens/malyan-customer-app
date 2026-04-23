import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GuestModal } from "../../components/GuestModal";
import { useAuthStore } from "../../lib/authStore";
import { supabase } from "../../lib/supabase";
import { colors, radii, shadows, spacing } from "../../lib/theme";
import type { InventoryRow } from "../../lib/types";
import { useCartStore } from "../../store/cartStore";

const IMAGE_H = 280;
const { width: SCREEN_W } = Dimensions.get("window");
const RELATED_SIZE = 120;

function getProductImages(product: InventoryRow | null): string[] {
  if (!product) return [];
  const fallback = product.image_url ? [product.image_url] : [];
  const raw = (product as InventoryRow & { image_urls?: unknown }).image_urls;
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    const parsed = (raw as unknown[])
      .map((v: unknown) => String(v ?? "").trim())
      .filter((v: string) => /^https?:\/\//.test(v));
    return parsed.length ? parsed : fallback;
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return fallback;
    try {
      const parsedJson = JSON.parse(value);
      if (Array.isArray(parsedJson)) {
        const parsed = (parsedJson as unknown[])
          .map((v: unknown) => String(v ?? "").trim())
          .filter((v: string) => /^https?:\/\//.test(v));
        if (parsed.length) return parsed;
      }
    } catch {
      const parsed = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => /^https?:\/\//.test(v));
      if (parsed.length) return parsed;
    }
  }
  return fallback;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const isGuest = useAuthStore((s) => s.isGuest);
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<InventoryRow | null>(null);
  const [related, setRelated] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  const loadRelated = useCallback(async (row: InventoryRow, productId: string) => {
    if (!row.category) {
      setRelated([]);
      return;
    }
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("category", row.category)
      .neq("id", productId)
      .limit(6);
    setRelated((data as InventoryRow[]) ?? []);
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const { data, error: qErr } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", id)
      .single();

    if (qErr) {
      setError(qErr.message);
      setProduct(null);
      setRelated([]);
    } else {
      const row = data as InventoryRow;
      setProduct(row);
      setQty(1);
      void loadRelated(row, String(id));
    }
    setLoading(false);
  }, [id, loadRelated]);

  useEffect(() => {
    load();
  }, [load]);

  const maxStock = product?.quantity;
  const maxAllowed = useMemo(() => {
    if (maxStock == null || maxStock < 0) return 99;
    return maxStock;
  }, [maxStock]);

  const title = product?.name_ar ?? "";
  const priceLabel = product
    ? `${(product.selling_price ?? 0).toFixed(2)} ${product.currency ?? "QAR"}`
    : "";
  const isOutOfStock = (product?.quantity ?? 0) === 0;
  const productImages = useMemo(() => getProductImages(product), [product]);

  const decQty = () => setQty((q) => Math.max(1, q - 1));
  const incQty = () => setQty((q) => Math.min(maxAllowed, q + 1));

  const handleAddToCart = () => {
    if (!product) return;
    if (isOutOfStock) return;
    if (isGuest || !session) {
      setGuestModalOpen(true);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name_ar ?? "",
      nameAr: product.name_ar,
      price: product.selling_price ?? 0,
      currency: product.currency ?? "QAR",
      imageUrl: product.image_url,
      quantity: qty,
      maxQuantity: maxStock != null && maxStock >= 0 ? maxStock : undefined,
      category: product.category ?? null,
    });
    Alert.alert("تمت الإضافة للسلة ✓");
  };

  const handleOrderNow = () => {
    if (!product) return;
    if (isOutOfStock) return;
    if (isGuest || !session) {
      setGuestModalOpen(true);
      return;
    }
    router.push({
      pathname: "/checkout",
      params: {
        productId: product.id,
        productName: title,
        productPrice: String(product.selling_price ?? 0),
        productCurrency: product.currency ?? "QAR",
      },
    });
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "تفاصيل المنتج" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Stack.Screen options={{ title: "تفاصيل المنتج" }} />
        <View style={styles.centeredPadded}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.red500} />
          <Text style={styles.errTitle}>لم يتم العثور على المنتج</Text>
          {error ? <Text style={styles.errDetail}>{error}</Text> : null}
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>رجوع</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GuestModal
        visible={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        onLogin={() => {
          setGuestModalOpen(false);
          router.push("/login");
        }}
      />
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.heroWrap}>
            {productImages.length > 0 ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {productImages.map((img, idx) => (
                  <Image
                    key={`${img}-${idx}`}
                    source={{ uri: img }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <LinearGradient
                colors={[colors.surface, colors.bgElevated]}
                style={[styles.heroImage, styles.heroPlaceholder]}
              >
                <Ionicons name="leaf-outline" size={80} color={colors.brand} />
              </LinearGradient>
            )}
            {productImages.length > 1 ? (
              <View style={styles.heroImageCount}>
                <Text style={styles.heroImageCountText}>{productImages.length} صور</Text>
              </View>
            ) : null}
            <Pressable style={styles.backOverlay} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </Pressable>
          </View>

          <Text style={styles.name}>{title}</Text>
          <Text style={styles.price}>{priceLabel}</Text>
          {isOutOfStock ? (
            <>
              <View style={styles.stockBadge}>
                <Text style={styles.stockBadgeText}>نفدت الكمية</Text>
              </View>
              <Text style={styles.unavailableText}>هذا المنتج غير متاح حالياً</Text>
            </>
          ) : null}

          {product.description ? (
            <Text style={styles.desc}>{product.description}</Text>
          ) : (
            <Text style={styles.noDesc}>لا يوجد وصف إضافي لهذا المنتج.</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.qtyRow}>
            <Pressable
              onPress={decQty}
              style={({ pressed }) => [styles.qtyBtnSide, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="remove" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.qtyVal}>{qty}</Text>
            <Pressable
              onPress={incQty}
              style={({ pressed }) => [
                styles.qtyBtnSide,
                styles.qtyBtnBrand,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleAddToCart}
            disabled={isOutOfStock}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.92 },
              isOutOfStock && styles.btnDisabled,
            ]}
          >
            <Text style={styles.addBtnText}>{isOutOfStock ? "غير متاح" : "أضف للسلة"}</Text>
          </Pressable>

          <Pressable
            onPress={handleOrderNow}
            disabled={isOutOfStock}
            style={({ pressed }) => [
              styles.orderBtn,
              pressed && { opacity: 0.92 },
              isOutOfStock && styles.btnDisabled,
            ]}
          >
            <Text style={styles.orderBtnText}>{isOutOfStock ? "غير متاح" : "اطلب الآن"}</Text>
          </Pressable>

          {related.length > 0 ? (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>منتجات مشابهة</Text>
              <FlatList
                horizontal
                data={related}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedList}
                nestedScrollEnabled
                renderItem={({ item: r }) => (
                  <Pressable
                    style={styles.relatedCard}
                    onPress={() => router.push(`/product/${r.id}`)}
                  >
                    <View style={styles.relatedImgWrap}>
                      {r.image_url ? (
                        <Image
                          source={{ uri: r.image_url }}
                          style={styles.relatedImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.relatedPlaceholder}>
                          <Ionicons name="leaf" size={36} color={colors.brand} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.relatedName} numberOfLines={2}>
                      {r.name_ar ?? ""}
                    </Text>
                    <Text style={styles.relatedPrice}>
                      {(r.selling_price ?? 0).toFixed(2)} {r.currency ?? "QAR"}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredPadded: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errTitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
  errDetail: {
    color: colors.red400,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  primaryBtnText: { color: colors.white, fontWeight: "700" },
  heroWrap: {
    width: SCREEN_W,
    height: IMAGE_H,
    backgroundColor: colors.surface,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: IMAGE_H,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  backOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroImageCount: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: colors.overlay,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroImageCountText: { color: colors.white, fontWeight: "800", fontSize: 11 },
  name: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  price: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  stockBadge: {
    alignSelf: "flex-end",
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    backgroundColor: colors.red500,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stockBadgeText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 12,
    textAlign: "right",
  },
  unavailableText: {
    color: colors.red400,
    fontSize: 14,
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  noDesc: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    gap: 24,
  },
  qtyBtnSide: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnBrand: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  qtyVal: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    minWidth: 32,
    textAlign: "center",
  },
  addBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.brandDark,
    ...shadows.soft,
  },
  addBtnText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  orderBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.goldMuted,
    ...shadows.goldGlow,
  },
  orderBtnText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 18,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  btnDisabled: { opacity: 0.5 },
  relatedSection: { marginTop: spacing.xl },
  relatedTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  relatedList: {
    paddingHorizontal: spacing.md,
    gap: 12,
    paddingBottom: spacing.md,
  },
  relatedCard: {
    width: RELATED_SIZE + 16,
    marginRight: 12,
  },
  relatedImgWrap: {
    width: RELATED_SIZE,
    height: RELATED_SIZE,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bgElevated,
    alignSelf: "center",
  },
  relatedImg: { width: "100%", height: "100%" },
  relatedPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  relatedName: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    marginTop: 8,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  relatedPrice: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 14,
    textAlign: "right",
    marginTop: 4,
  },
});
