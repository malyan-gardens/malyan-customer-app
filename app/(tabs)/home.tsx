import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { InventoryRow } from "../../lib/types";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: qErr } = await supabase
      .from("inventory")
      .select("*")
      .order("name", { ascending: true });

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((row) => {
      const c = row.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      if (category && row.category !== category) return false;
      if (!q) return true;
      const name = (row.name_ar ?? row.name ?? "").toLowerCase();
      const desc = (row.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [items, search, category]);

  const renderItem = useCallback(
    ({ item }: { item: InventoryRow }) => {
      const title = item.name_ar ?? item.name;
      const priceLabel = `${item.price.toFixed(2)} ${item.currency ?? "QAR"}`;
      return (
        <Pressable
          onPress={() => router.push(`/product/${item.id}`)}
          className="m-2 flex-1 min-w-[44%] max-w-[50%] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 active:opacity-90"
        >
          <View className="aspect-square bg-neutral-800">
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="leaf-outline" size={48} color="#1a7a3c" />
              </View>
            )}
          </View>
          <View className="p-3">
            <Text
              className="text-white font-semibold text-base text-right"
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text className="text-brand mt-1 font-bold text-right">
              {priceLabel}
            </Text>
          </View>
        </Pressable>
      );
    },
    [router]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#1a7a3c" />
        <Text className="text-neutral-400 mt-4">جاري التحميل…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["bottom"]}>
      <View className="px-4 pt-2 pb-3 border-b border-neutral-900">
        <Text className="text-white text-2xl font-bold text-right mb-1">
          ماليان للتجارة والحدائق
        </Text>
        <Text className="text-neutral-500 text-sm text-right mb-4">
          نباتات اصطناعية فاخرة في قطر
        </Text>
        <View className="flex-row items-center bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-800">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن منتج…"
            placeholderTextColor="#6b7280"
            className="flex-1 text-white text-right py-2 px-2 text-base"
            style={{ writingDirection: "rtl" }}
          />
        </View>
      </View>

      {categories.length > 0 && (
        <View className="border-b border-neutral-900 py-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {[null, ...categories].map((cat) => {
              const selected =
                (cat === null && category === null) ||
                (cat !== null && category === cat);
              const label = cat === null ? "الكل" : cat;
              return (
                <Pressable
                  key={cat === null ? "__all__" : cat}
                  onPress={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full border ${
                    selected
                      ? "bg-brand border-brand"
                      : "bg-neutral-900 border-neutral-700"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      selected ? "text-white" : "text-neutral-300"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={48} color="#6b7280" />
          <Text className="text-neutral-400 text-center mt-4 text-right">
            تعذر تحميل المنتجات. تأكد من جدول inventory في Supabase والصلاحيات.
          </Text>
          <Text className="text-red-400/80 text-sm mt-2 text-center">{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            className="mt-6 bg-brand px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 8 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#1a7a3c"
            />
          }
          ListEmptyComponent={
            <View className="py-16 items-center px-6">
              <Text className="text-neutral-500 text-center">
                لا توجد منتجات مطابقة للبحث أو الفئة.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}
