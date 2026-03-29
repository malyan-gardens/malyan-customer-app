import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, shadows, spacing } from "../../lib/theme";
import type { InventoryRow } from "../../lib/types";
import { supabase } from "../../lib/supabase";
import { useCartStore } from "../../store/cartStore";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<InventoryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

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
    } else {
      setProduct(data as InventoryRow);
      setQty(1);
    }
    setLoading(false);
  }, [id]);

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

  const heightLabel = useMemo(() => {
    if (!product) return null;
    const h = product.height_cm;
    if (h === null || h === undefined || h === "") return null;
    return typeof h === "number" ? `${h} سم` : String(h);
  }, [product]);

  const decQty = () => setQty((q) => Math.max(1, q - 1));
  const incQty = () =>
    setQty((q) => Math.min(maxAllowed, q + 1));

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name_ar ?? "",
      nameAr: product.name_ar,
      price: product.selling_price ?? 0,
      currency: product.currency ?? "QAR",
      imageUrl: product.image_url,
      quantity: qty,
      maxQuantity:
        maxStock != null && maxStock >= 0 ? maxStock : undefined,
    });
    router.push("/(tabs)/cart");
  };

  const openAi = () => {
    if (!id) return;
    router.push({
      pathname: "/(tabs)/assistant",
      params: {
        from: "product",
        productId: String(id),
        productName: title,
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
      <Stack.Screen options={{ title: title.slice(0, 36) }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[colors.surface, colors.bgElevated]}
              style={styles.heroPlaceholder}
            >
              <Ionicons name="leaf-outline" size={80} color={colors.brand} />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{title}</Text>
          {product.category ? (
            <View style={styles.catPill}>
              <Text style={styles.category}>{product.category}</Text>
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceLabel}</Text>
            {heightLabel ? (
              <View style={styles.heightBadge}>
                <Ionicons name="resize-outline" size={16} color={colors.gold} />
                <Text style={styles.heightText}>{heightLabel}</Text>
              </View>
            ) : null}
          </View>

          {product.description ? (
            <Text style={styles.desc}>{product.description}</Text>
          ) : (
            <Text style={styles.noDesc}>لا يوجد وصف إضافي لهذا المنتج.</Text>
          )}

          {maxStock != null && maxStock >= 0 ? (
            <Text style={styles.stock}>المتاح في المخزون: {maxStock}</Text>
          ) : null}

          <Text style={styles.qtyLabel}>الكمية</Text>
          <View style={styles.qtyRow}>
            <Pressable
              onPress={incQty}
              style={({ pressed }) => [
                styles.qtyBtn,
                styles.qtyBtnBrand,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.qtyVal}>{qty}</Text>
            <Pressable
              onPress={decQty}
              style={({ pressed }) => [
                styles.qtyBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="remove" size={22} color={colors.white} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <LinearGradient
              colors={[colors.brand, colors.brandDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGrad}
            >
              <Ionicons name="cart" size={22} color="#fff" />
              <Text style={styles.addBtnText}>أضف إلى السلة</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={openAi}
            style={({ pressed }) => [
              styles.aiBtn,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.aiBtnText}>🤖 اسألني عن هذا المنتج</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>متابعة التسوق</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
  hero: {
    aspectRatio: 1,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  name: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 34,
  },
  catPill: {
    alignSelf: "flex-end",
    marginTop: 10,
    backgroundColor: colors.goldMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  category: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    flexWrap: "wrap",
    gap: 12,
  },
  price: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "right",
  },
  heightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heightText: { color: colors.textSecondary, fontWeight: "700" },
  desc: {
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: "right",
    fontSize: 16,
    lineHeight: 28,
  },
  noDesc: {
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: "right",
    fontSize: 14,
  },
  stock: {
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "right",
    fontSize: 14,
  },
  qtyLabel: {
    color: colors.white,
    fontWeight: "700",
    marginTop: spacing.lg,
    textAlign: "right",
    fontSize: 16,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
  },
  qtyBtn: {
    width: 48,
    height: 48,
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
    fontSize: 22,
    fontWeight: "800",
    minWidth: 36,
    textAlign: "center",
  },
  addBtn: {
    marginTop: spacing.xl,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.soft,
  },
  addBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  addBtnText: { color: colors.white, fontWeight: "800", fontSize: 18 },
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
  secondaryBtn: { marginTop: spacing.md, paddingVertical: 12, alignItems: "center" },
  secondaryText: { color: colors.textMuted },
});
