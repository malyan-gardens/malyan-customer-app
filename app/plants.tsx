import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProductImageUrls, shuffleArray } from "../lib/catalogUi";
import { colors, radii, shadows, spacing } from "../lib/theme";
import type { InventoryRow, ProductTypeRow } from "../lib/types";
import { supabase } from "../lib/supabase";
import { useCartStore } from "../store/cartStore";

const GRID_GAP = 12;
const GRID_H_PAD = spacing.md;
const PRODUCT_COLUMNS = 2;

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

export default function PlantsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const addItem = useCartStore((s) => s.addItem);
  const [productTypes, setProductTypes] = useState<ProductTypeRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [typeProducts, setTypeProducts] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const typeColWidth =
    (width - GRID_H_PAD * 2 - GRID_GAP * (PRODUCT_COLUMNS - 1)) / PRODUCT_COLUMNS;

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("product_types")
      .select("id, name_ar, icon")
      .order("name_ar", { ascending: true });
    if (qErr) {
      setError(qErr.message);
      setProductTypes([]);
    } else {
      setProductTypes((data as ProductTypeRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  const loadProductsForType = useCallback(async (typeId: string) => {
    setLoadingProducts(true);
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
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    if (!selectedTypeId) {
      setTypeProducts([]);
      return;
    }
    void loadProductsForType(selectedTypeId);
  }, [selectedTypeId, loadProductsForType]);

  const selectedTypeLabel = useMemo(() => {
    if (!selectedTypeId) return "المنتجات";
    return productTypes.find((t) => t.id === selectedTypeId)?.name_ar ?? "المنتجات";
  }, [productTypes, selectedTypeId]);

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productTypes;
    return productTypes.filter((t) => (t.name_ar ?? "").toLowerCase().includes(q));
  }, [productTypes, search]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    typeProducts.forEach((r) => {
      const c = r.category?.trim();
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ar"));
  }, [typeProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minN = parseFloat(priceMin);
    const maxN = parseFloat(priceMax);
    return typeProducts.filter((row) => {
      if (catFilter && row.category !== catFilter) return false;
      const p = row.selling_price ?? 0;
      if (!Number.isNaN(minN) && p < minN) return false;
      if (!Number.isNaN(maxN) && p > maxN) return false;
      if (!q) return true;
      const name = (row.name_ar ?? "").toLowerCase();
      const desc = (row.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [typeProducts, search, catFilter, priceMin, priceMax]);

  const clearFilters = () => {
    setCatFilter(null);
    setPriceMin("");
    setPriceMax("");
  };

  const columns = PRODUCT_COLUMNS;

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
      <Stack.Screen options={{ title: selectedTypeId ? selectedTypeLabel : "المنتجات" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={styles.toolbar}>
          {selectedTypeId ? (
            <Pressable
              style={styles.backPill}
              onPress={() => {
                setSelectedTypeId(null);
                setSearch("");
                clearFilters();
              }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.gold} />
            </Pressable>
          ) : null}
          {selectedTypeId ? (
            <Pressable style={styles.filterPill} onPress={() => setFilterOpen(true)}>
              <Ionicons name="funnel" size={18} color={colors.gold} />
              <Text style={styles.filterPillText}>تصفية</Text>
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={styles.searchBox}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={selectedTypeId ? "بحث في المنتجات…" : "بحث عن نوع…"}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            <Ionicons name="search" size={20} color={colors.textMuted} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retry}
              onPress={() => {
                if (selectedTypeId) void loadProductsForType(selectedTypeId);
                else void loadTypes();
              }}
            >
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : !selectedTypeId ? (
          <ScrollView
            contentContainerStyle={styles.scrollPad}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.typesGrid}>
              {filteredTypes.length === 0 ? (
                <Text style={styles.empty}>لا توجد أنواع.</Text>
              ) : (
                filteredTypes.map((t) => (
                  <View key={t.id} style={[styles.typeGridCell, { width: typeColWidth }]}>
                    <Pressable
                      style={styles.typeCard}
                      onPress={() => {
                        setSearch("");
                        clearFilters();
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
          </ScrollView>
        ) : loadingProducts ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollPad}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text style={styles.empty}>لا توجد منتجات.</Text>
            ) : (
              Array.from({ length: Math.ceil(filtered.length / columns) }, (_, row) => (
                <View key={row} style={styles.gridRow}>
                  {filtered.slice(row * columns, row * columns + columns).map((item) => (
                    <View key={item.id} style={styles.gridCell}>
                      <PlantCard
                        item={item}
                        onOpen={() => router.push(`/product/${item.id}`)}
                        onOrder={() =>
                          router.push({
                            pathname: "/checkout",
                            params: {
                              productId: item.id,
                              productName: item.name_ar ?? "",
                              productPrice: String(item.selling_price ?? 0),
                              productCurrency: item.currency ?? "QAR",
                            },
                          })
                        }
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
                            category: item.category ?? null,
                          })
                        }
                      />
                    </View>
                  ))}
                </View>
              ))
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
  onOrder,
  onAdd,
}: {
  item: InventoryRow;
  onOpen: () => void;
  onOrder: () => void;
  onAdd: () => void;
}) {
  const { width } = useWindowDimensions();
  const title = item.name_ar ?? "";
  const price = (item.selling_price ?? 0).toFixed(2);
  const isOutOfStock = (item.quantity ?? 0) === 0;
  const screenWidth = Dimensions.get("window").width;
  const cardWidth =
    (screenWidth - GRID_H_PAD * 2 - GRID_GAP * (PRODUCT_COLUMNS - 1)) / PRODUCT_COLUMNS;
  const imageHeight = Math.max(100, Math.floor(cardWidth * 0.62));
  const images = useMemo(() => getProductImageUrls(item), [item]);
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [pressed && { opacity: 0.94 }]}
      >
        <View style={[styles.cardImg, { height: imageHeight }]}>
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
              >
                {images.map((img: string, idx: number) => (
                  <Image
                    key={`${img}-${idx}`}
                    source={{ uri: img }}
                    style={[styles.cardImgInner, { width: cardWidth, height: imageHeight }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {images.length > 1 ? (
                <View style={styles.imageCountBadge}>
                  <Text style={styles.imageCountBadgeText}>{images.length} صور</Text>
                </View>
              ) : null}
            </>
          ) : (
            <LinearGradient
              colors={[colors.surface, colors.bgElevated]}
              style={styles.cardImgInner}
            >
              <Ionicons name="leaf" size={36} color={colors.brand} />
            </LinearGradient>
          )}
          {isOutOfStock ? (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>نفدت الكمية</Text>
            </View>
          ) : null}
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
      <Pressable
        onPress={onAdd}
        style={[styles.cardAdd, isOutOfStock && styles.cardBtnDisabled]}
        disabled={isOutOfStock}
      >
        <Text style={styles.cardAddText}>{isOutOfStock ? "غير متاح" : "أضف للسلة"}</Text>
      </Pressable>
      <Pressable
        onPress={onOrder}
        style={[styles.cardOrder, isOutOfStock && styles.cardBtnDisabled]}
        disabled={isOutOfStock}
      >
        <Text style={styles.cardOrderText}>{isOutOfStock ? "غير متاح" : "اطلب الآن"}</Text>
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
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backPill: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  typesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    minHeight: 118,
    ...shadows.card,
  },
  typeCardName: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
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
  cardImg: { aspectRatio: 1, backgroundColor: colors.bgElevated, position: "relative" },
  imageCountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
  stockBadgeText: { color: colors.white, fontWeight: "800", fontSize: 11, textAlign: "right" },
  cardImgInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 10 },
  cardTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
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
    marginHorizontal: 10,
    marginBottom: 6,
    backgroundColor: colors.brand,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  cardAddText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  cardOrder: {
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: colors.gold,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  cardOrderText: { color: colors.bg, fontWeight: "800", fontSize: 12 },
  cardBtnDisabled: { opacity: 0.5 },
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
