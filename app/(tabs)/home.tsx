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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";
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
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.cardImageWrap}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Ionicons name="leaf-outline" size={48} color={colors.brand} />
              </View>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.cardPrice}>{priceLabel}</Text>
          </View>
        </Pressable>
      );
    },
    [router]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>جاري التحميل…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>ماليان للتجارة والحدائق</Text>
        <Text style={styles.subtitle}>نباتات اصطناعية فاخرة في قطر</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={colors.neutral500} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن منتج…"
            placeholderTextColor={colors.neutral500}
            style={[styles.searchInput, { writingDirection: "rtl" }]}
          />
        </View>
      </View>

      {categories.length > 0 && (
        <View style={styles.categoryBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
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
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : styles.chipIdle,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected ? styles.chipTextSelected : styles.chipTextIdle,
                    ]}
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
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.neutral500} />
          <Text style={styles.errorMsg}>
            تعذر تحميل المنتجات. تأكد من جدول inventory في Supabase والصلاحيات.
          </Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: colors.neutral400, marginTop: 16 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral900,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.neutral500,
    fontSize: 14,
    textAlign: "right",
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral900,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutral800,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    textAlign: "right",
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  categoryBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral900,
    paddingVertical: 12,
  },
  categoryScroll: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipIdle: {
    backgroundColor: colors.neutral900,
    borderColor: colors.neutral700,
  },
  chipText: { fontWeight: "600" },
  chipTextSelected: { color: colors.white },
  chipTextIdle: { color: colors.neutral300 },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorMsg: {
    color: colors.neutral400,
    textAlign: "center",
    marginTop: 16,
  },
  errorDetail: {
    color: colors.red400,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: { color: colors.white, fontWeight: "600" },
  listContent: { paddingBottom: 24 },
  columnWrap: { paddingHorizontal: 8 },
  card: {
    flex: 1,
    maxWidth: "50%",
    margin: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.neutral900,
    borderWidth: 1,
    borderColor: colors.neutral800,
  },
  cardPressed: { opacity: 0.9 },
  cardImageWrap: {
    aspectRatio: 1,
    backgroundColor: colors.neutral800,
  },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 12 },
  cardTitle: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
    textAlign: "right",
  },
  cardPrice: {
    color: colors.brand,
    marginTop: 4,
    fontWeight: "700",
    textAlign: "right",
  },
  emptyBox: { paddingVertical: 64, alignItems: "center", paddingHorizontal: 24 },
  emptyText: { color: colors.neutral500, textAlign: "center" },
});
