import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../lib/theme";
import type { InventoryRow } from "../lib/types";
import { supabase } from "../lib/supabase";
import { useCartStore } from "../store/cartStore";

export default function PlantsScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((r) => {
      const c = r.category?.trim();
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ar"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minN = parseFloat(priceMin);
    const maxN = parseFloat(priceMax);
    return items.filter((row) => {
      if (catFilter && row.category !== catFilter) return false;
      const p = row.selling_price ?? 0;
      if (!Number.isNaN(minN) && p < minN) return false;
      if (!Number.isNaN(maxN) && p > maxN) return false;
      if (!q) return true;
      const name = (row.name_ar ?? "").toLowerCase();
      const desc = (row.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [items, search, catFilter, priceMin, priceMax]);

  const clearFilters = () => {
    setCatFilter(null);
    setPriceMin("");
    setPriceMax("");
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "المنتجات" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "المنتجات" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={styles.toolbar}>
          <Pressable
            style={styles.filterPill}
            onPress={() => setFilterOpen(true)}
          >
            <Ionicons name="funnel" size={18} color={colors.gold} />
            <Text style={styles.filterPillText}>تصفية</Text>
          </Pressable>
          <View style={styles.searchBox}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="بحث…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            <Ionicons name="search" size={20} color={colors.textMuted} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollPad}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text style={styles.empty}>لا توجد منتجات.</Text>
            ) : (
              Array.from(
                { length: Math.ceil(filtered.length / 2) },
                (_, row) => (
                  <View key={row} style={styles.gridRow}>
                    {filtered.slice(row * 2, row * 2 + 2).map((item) => (
                      <View key={item.id} style={styles.gridCell}>
                        <PlantCard
                          item={item}
                          onOpen={() => router.push(`/product/${item.id}`)}
                          onAdd={() =>
                            addItem({
                              productId: item.id,
                              name: item.name_ar ?? "",
                              nameAr: item.name_ar,
                              price: item.selling_price ?? 0,
                              currency: item.currency ?? "QAR",
                              imageUrl: item.image_url,
                              quantity: 1,
                              maxQuantity:
                                item.quantity != null && item.quantity >= 0
                                  ? item.quantity
                                  : undefined,
                            })
                          }
                        />
                      </View>
                    ))}
                  </View>
                )
              )
            )}
          </ScrollView>
        )}

        <Modal
          visible={filterOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setFilterOpen(false)}
          >
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>تصفية النتائج</Text>
              <Text style={styles.modalLabel}>الفئة</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catPick}
              >
                <Pressable
                  onPress={() => setCatFilter(null)}
                  style={[
                    styles.catOpt,
                    catFilter === null && styles.catOptOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.catOptText,
                      catFilter === null && styles.catOptTextOn,
                    ]}
                  >
                    الكل
                  </Text>
                </Pressable>
                {categories.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCatFilter(c)}
                    style={[
                      styles.catOpt,
                      catFilter === c && styles.catOptOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catOptText,
                        catFilter === c && styles.catOptTextOn,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.modalLabel}>السعر (QAR)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  value={priceMin}
                  onChangeText={setPriceMin}
                  placeholder="من"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.priceIn}
                />
                <Text style={styles.priceDash}>—</Text>
                <TextInput
                  value={priceMax}
                  onChangeText={setPriceMax}
                  placeholder="إلى"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.priceIn}
                />
              </View>
              <Pressable
                style={styles.applyBtn}
                onPress={() => setFilterOpen(false)}
              >
                <Text style={styles.applyBtnText}>تطبيق</Text>
              </Pressable>
              <Pressable onPress={clearFilters}>
                <Text style={styles.clearLink}>مسح التصفية</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

function PlantCard({
  item,
  onOpen,
  onAdd,
}: {
  item: InventoryRow;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const title = item.name_ar ?? "";
  const price = (item.selling_price ?? 0).toFixed(2);
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [pressed && { opacity: 0.94 }]}
      >
        <View style={styles.cardImg}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.cardImgInner}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[colors.surface, colors.bgElevated]}
              style={styles.cardImgInner}
            >
              <Ionicons name="leaf" size={36} color={colors.brand} />
            </LinearGradient>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.cardPrice}>
            {price} {item.currency ?? "QAR"}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onAdd} style={styles.cardAdd}>
        <Text style={styles.cardAddText}>أضف للسلة</Text>
      </Pressable>
    </View>
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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillText: { color: colors.gold, fontWeight: "700" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    paddingVertical: 12,
    textAlign: "right",
    fontSize: 15,
  },
  scrollPad: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 32,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  gridCell: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardImg: { aspectRatio: 1, backgroundColor: colors.bgElevated },
  cardImgInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 12 },
  cardTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
    minHeight: 40,
  },
  cardPrice: {
    color: colors.gold,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "right",
  },
  cardAdd: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.brand,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  cardAddText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  errorBox: { padding: spacing.lg, alignItems: "center" },
  errorText: { color: colors.textSecondary, textAlign: "center" },
  retry: {
    marginTop: 16,
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryText: { color: colors.white, fontWeight: "700" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.gold,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: spacing.md,
  },
  modalLabel: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 8,
    fontWeight: "600",
  },
  catPick: { gap: 8, marginBottom: spacing.md, flexDirection: "row" },
  catOpt: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catOptOn: {
    backgroundColor: colors.brandMuted,
    borderColor: colors.gold,
  },
  catOptText: { color: colors.textSecondary, fontWeight: "600" },
  catOptTextOn: { color: colors.white },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.lg,
  },
  priceIn: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    padding: 14,
    textAlign: "center",
    fontSize: 16,
  },
  priceDash: { color: colors.gold, fontWeight: "700" },
  applyBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: "center",
  },
  applyBtnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  clearLink: {
    color: colors.gold,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
});
