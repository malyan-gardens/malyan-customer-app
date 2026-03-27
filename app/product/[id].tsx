import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
        <View className="flex-1 bg-black items-center justify-center">
          <ActivityIndicator size="large" color="#1a7a3c" />
        </View>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Stack.Screen options={{ title: "تفاصيل المنتج" }} />
        <View className="flex-1 bg-black items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="text-neutral-400 text-center mt-4">
            لم يتم العثور على المنتج
          </Text>
          {error ? (
            <Text className="text-red-400/80 text-sm mt-2 text-center">{error}</Text>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            className="mt-6 bg-brand px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">رجوع</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: title.slice(0, 40) }} />
      <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="aspect-[4/3] bg-neutral-900">
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="leaf-outline" size={80} color="#1a7a3c" />
            </View>
          )}
        </View>

        <View className="px-5 pt-6">
          <Text className="text-white text-2xl font-bold text-right leading-8">
            {title}
          </Text>
          {product.category ? (
            <Text className="text-brand mt-2 text-right font-medium">
              {product.category}
            </Text>
          ) : null}
          <Text className="text-brand text-3xl font-extrabold mt-4 text-right">
            {priceLabel}
          </Text>

          {product.description ? (
            <Text className="text-neutral-300 mt-6 text-right text-base leading-7">
              {product.description}
            </Text>
          ) : (
            <Text className="text-neutral-600 mt-6 text-right text-sm">
              لا يوجد وصف إضافي لهذا المنتج.
            </Text>
          )}

          {product.stock_quantity != null && (
            <Text className="text-neutral-500 mt-4 text-right text-sm">
              المتاح: {product.stock_quantity}
            </Text>
          )}

          <Pressable
            onPress={handleAddToCart}
            className="mt-10 bg-brand py-4 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90"
          >
            <Ionicons name="cart" size={22} color="#fff" />
            <Text className="text-white font-bold text-lg">أضف إلى السلة</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="mt-4 py-3 items-center"
          >
            <Text className="text-neutral-500">متابعة التسوق</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
