import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../../lib/theme";
import { cartTotal, useCartStore, type CartLine } from "../../store/cartStore";

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const total = cartTotal(items);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سلة التسوق</Text>
        <Text style={styles.headerSub}>مراجعة طلبك قبل الإرسال</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <LinearGradient
              colors={[colors.surface, colors.bgElevated]}
              style={styles.emptyIcon}
            >
              <Ionicons name="cart-outline" size={56} color={colors.gold} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>السلة فارغة</Text>
            <Text style={styles.emptySub}>
              اكتشف تشكيلة المنتجات الفاخرة
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/home")}
              style={styles.exploreBtn}
            >
              <Text style={styles.exploreBtnText}>تصفح المنتجات</Text>
            </Pressable>
          </View>
        ) : (
          items.map((line) => (
            <CartLineRow
              key={line.productId}
              line={line}
              onInc={() => setQuantity(line.productId, line.quantity + 1)}
              onDec={() => setQuantity(line.productId, line.quantity - 1)}
              onRemove={() => removeItem(line.productId)}
            />
          ))
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          <LinearGradient
            colors={[colors.bgElevated, colors.bg]}
            style={styles.footerGrad}
          >
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الإجمالي</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} QAR</Text>
            </View>
            <Pressable
              style={styles.checkoutBtn}
              onPress={() => router.push("/checkout")}
            >
              <Text style={styles.checkoutText}>إتمام الطلب</Text>
              <Ionicons name="arrow-back" size={20} color={colors.bg} />
            </Pressable>
            <Pressable onPress={clear} style={styles.clearBtn}>
              <Text style={styles.clearText}>مسح السلة</Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

function CartLineRow({
  line,
  onInc,
  onDec,
  onRemove,
}: {
  line: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const title = line.nameAr ?? line.name;
  const atMax =
    line.maxQuantity != null &&
    line.maxQuantity >= 0 &&
    line.quantity >= line.maxQuantity;

  return (
    <View style={styles.lineRow}>
      <View style={styles.thumb}>
        {line.imageUrl ? (
          <Image
            source={{ uri: line.imageUrl }}
            style={styles.thumbImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="leaf" size={28} color={colors.brand} />
          </View>
        )}
      </View>
      <View style={styles.lineBody}>
        <Text style={styles.lineTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.linePrice}>
          {(line.price * line.quantity).toFixed(2)} {line.currency}
        </Text>
        {line.maxQuantity != null && line.maxQuantity >= 0 ? (
          <Text style={styles.maxHint}>
            حد المخزون: {line.maxQuantity}
            {atMax ? " — الحد الأقصى" : ""}
          </Text>
        ) : null}
        <View style={styles.qtyRow}>
          <Pressable onPress={onDec} style={styles.qtyBtn}>
            <Ionicons name="remove" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.qtyText}>{line.quantity}</Text>
          <Pressable
            onPress={onInc}
            style={[styles.qtyBtn, styles.qtyBtnBrand, atMax && styles.qtyBtnDisabled]}
            disabled={atMax}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={onRemove} style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.red400} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "right",
  },
  headerSub: {
    color: colors.textMuted,
    textAlign: "right",
    marginTop: 6,
    fontSize: 14,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 200 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.white,
    marginTop: 24,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySub: {
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  exploreBtn: {
    marginTop: 28,
    backgroundColor: colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radii.lg,
    ...shadows.goldGlow,
  },
  exploreBtnText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 16,
  },
  lineRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: "hidden",
    ...shadows.soft,
  },
  thumb: {
    width: 108,
    height: 108,
    backgroundColor: colors.bgElevated,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lineBody: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  lineTitle: {
    color: colors.white,
    fontWeight: "700",
    textAlign: "right",
    fontSize: 15,
  },
  linePrice: {
    color: colors.gold,
    textAlign: "right",
    fontWeight: "800",
    marginTop: 4,
  },
  maxHint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 8,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.neutral800,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtnBrand: { backgroundColor: colors.brand, borderColor: colors.brand },
  qtyBtnDisabled: { opacity: 0.45 },
  qtyText: {
    color: colors.white,
    fontWeight: "800",
    minWidth: 28,
    textAlign: "center",
  },
  trashBtn: { marginRight: 4, padding: 8 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerGrad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: { color: colors.textSecondary, fontSize: 16 },
  totalValue: { color: colors.white, fontSize: 22, fontWeight: "800" },
  checkoutBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.goldGlow,
  },
  checkoutText: { color: colors.bg, fontWeight: "800", fontSize: 18 },
  checkoutHint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
  clearBtn: { marginTop: 12, paddingVertical: 8, alignItems: "center" },
  clearText: { color: colors.textMuted, fontSize: 14 },
});
