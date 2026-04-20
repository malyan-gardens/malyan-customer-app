import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { GuestModal } from "../../components/GuestModal";
import { useAuthStore } from "../../lib/authStore";
import { colors, radii, spacing } from "../../lib/theme";
import {
  calculateBestDiscount,
  getActivePromotions,
  type CartItemForDiscount,
  type Promotion,
} from "../../lib/promotions";
import { cartTotal, useCartStore, type CartLine } from "../../store/cartStore";

export default function CartScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = cartTotal(items);
  const [guestOpen, setGuestOpen] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await getActivePromotions();
      if (!cancelled) setPromotions(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const discountInput = useMemo((): CartItemForDiscount[] => {
    return items.map((i) => ({
      productId: i.productId,
      name: i.nameAr ?? i.name,
      price: i.price,
      quantity: i.quantity,
      category: i.category,
    }));
  }, [items]);

  const discountResult = useMemo(
    () => calculateBestDiscount(discountInput, promotions),
    [discountInput, promotions]
  );

  const onCheckout = () => {
    if (!session) {
      setGuestOpen(true);
      return;
    }
    router.push({
      pathname: "/checkout",
      params: {
        finalTotal: String(discountResult.finalTotal),
        appliedPromotionId: discountResult.appliedPromotion?.id ?? "",
        discountAmount: String(discountResult.discountAmount),
        discountLabel: discountResult.discountLabel,
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <GuestModal
        visible={guestOpen}
        onClose={() => setGuestOpen(false)}
        onLogin={() => {
          setGuestOpen(false);
          router.push("/login");
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>سلة التسوق</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cart-outline" size={80} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>سلتك فارغة</Text>
            <Text style={styles.emptySub}>أضف منتجات لتبدأ التسوق</Text>
            <Pressable onPress={() => router.push("/plants")} style={styles.exploreBtn}>
              <Text style={styles.exploreBtnText}>تصفح المنتجات</Text>
            </Pressable>
          </View>
        ) : (
          items.map((line) => (
            <SwipeableCartRow
              key={line.productId}
              line={line}
              onInc={() => setQuantity(line.productId, line.quantity + 1)}
              onDec={() => {
                if (line.quantity <= 1) {
                  removeItem(line.productId);
                } else {
                  setQuantity(line.productId, line.quantity - 1);
                }
              }}
              onRemove={() => removeItem(line.productId)}
            />
          ))
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          {discountResult.discountAmount > 0 && discountResult.discountLabel ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{discountResult.discountLabel}</Text>
            </View>
          ) : null}
          {discountResult.discountAmount > 0 ? (
            <>
              <Text style={styles.totalLineMuted}>
                المجموع:{" "}
                <Text style={styles.totalStruck}>
                  {discountResult.originalTotal.toFixed(2)} QAR
                </Text>
              </Text>
              <Text style={styles.afterDiscountLine}>
                بعد الخصم:{" "}
                <Text style={styles.totalGoldLarge}>{discountResult.finalTotal.toFixed(2)} QAR</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.totalLine}>
              الإجمالي:{" "}
              <Text style={styles.totalGold}>{total.toFixed(2)} QAR</Text>
            </Text>
          )}
          <Pressable style={styles.checkoutBtn} onPress={onCheckout}>
            <Text style={styles.checkoutText}>إتمام الطلب</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function SwipeableCartRow({
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
  const lineTotal = line.price * line.quantity;
  const atMax =
    line.maxQuantity != null &&
    line.maxQuantity >= 0 &&
    line.quantity >= line.maxQuantity;

  const renderLeftActions = () => (
    <Pressable style={styles.swipeDelete} onPress={onRemove}>
      <Ionicons name="trash-outline" size={26} color={colors.white} />
    </Pressable>
  );

  return (
    <Swipeable renderLeftActions={renderLeftActions} overshootLeft={false}>
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
              <Ionicons name="leaf" size={24} color={colors.brand} />
            </View>
          )}
        </View>
        <View style={styles.lineBody}>
          <Text style={styles.lineTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.unitPrice}>
            {line.price.toFixed(2)} {line.currency}
          </Text>
          <View style={styles.midRow}>
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
            </View>
            <Text style={styles.lineTotal}>
              {lineTotal.toFixed(2)} {line.currency}
            </Text>
          </View>
        </View>
        <Pressable onPress={onRemove} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.red400} />
        </Pressable>
      </View>
    </Swipeable>
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
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 160 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: colors.white,
    marginTop: 20,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  emptySub: {
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  exploreBtn: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  exploreBtnText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  swipeDelete: {
    backgroundColor: colors.red500,
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    marginBottom: 10,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.bgElevated,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lineBody: { flex: 1, marginHorizontal: 10 },
  lineTitle: {
    color: colors.white,
    fontWeight: "700",
    textAlign: "right",
    fontSize: 14,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  unitPrice: {
    color: colors.textMuted,
    textAlign: "right",
    fontSize: 12,
    marginTop: 4,
  },
  midRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 34,
    height: 34,
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
    minWidth: 24,
    textAlign: "center",
  },
  lineTotal: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 15,
    textAlign: "right",
  },
  deleteBtn: { padding: 8 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  discountPill: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    maxWidth: "100%",
  },
  discountPillText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  totalLine: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 12,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  totalLineMuted: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  totalStruck: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
    fontWeight: "700",
  },
  afterDiscountLine: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 12,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  totalGold: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 18,
  },
  totalGoldLarge: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 20,
  },
  checkoutBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.brandDark,
  },
  checkoutText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
});
