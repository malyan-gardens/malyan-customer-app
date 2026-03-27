import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../../lib/theme";
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
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const title = product?.name_ar ?? product?.name ?? "";
  const priceLabel = product
    ? `${product.price.toFixed(2)} ${product.currency ?? "QAR"}`
    : "";

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      nameAr: product.name_ar,
      price: product.price,
      currency: product.currency ?? "QAR",
      imageUrl: product.image_url,
      quantity: 1,
    });
    router.push("/(tabs)/cart");
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "تفاصيل المنتج" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand} />
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
          <Pressable
            onPress={() => router.back()}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>رجوع</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: title.slice(0, 40) }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="leaf-outline" size={80} color={colors.brand} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{title}</Text>
          {product.category ? (
            <Text style={styles.category}>{product.category}</Text>
          ) : null}
          <Text style={styles.price}>{priceLabel}</Text>

          {product.description ? (
            <Text style={styles.desc}>{product.description}</Text>
          ) : (
            <Text style={styles.noDesc}>لا يوجد وصف إضافي لهذا المنتج.</Text>
          )}

          {product.stock_quantity != null && (
            <Text style={styles.stock}>
              المتاح: {product.stock_quantity}
            </Text>
          )}

          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="cart" size={22} color="#fff" />
            <Text style={styles.addBtnText}>أضف إلى السلة</Text>
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
  scrollContent: { paddingBottom: 32 },
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
    color: colors.neutral400,
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
    borderRadius: 12,
  },
  primaryBtnText: { color: colors.white, fontWeight: "600" },
  hero: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.neutral900,
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  name: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 32,
  },
  category: {
    color: colors.brand,
    marginTop: 8,
    textAlign: "right",
    fontWeight: "500",
  },
  price: {
    color: colors.brand,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "right",
  },
  desc: {
    color: colors.neutral300,
    marginTop: 24,
    textAlign: "right",
    fontSize: 16,
    lineHeight: 28,
  },
  noDesc: {
    color: colors.neutral600,
    marginTop: 24,
    textAlign: "right",
    fontSize: 14,
  },
  stock: {
    color: colors.neutral500,
    marginTop: 16,
    textAlign: "right",
    fontSize: 14,
  },
  addBtn: {
    marginTop: 40,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 18 },
  secondaryBtn: { marginTop: 16, paddingVertical: 12, alignItems: "center" },
  secondaryText: { color: colors.neutral500 },
});
