import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";
import { cartTotal, useCartStore } from "../../store/cartStore";

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const total = cartTotal(items);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cart-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>السلة فارغة</Text>
            <Text style={styles.emptySub}>
              تصفح المتجر وأضف منتجاتك المفضلة
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/home")}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>تصفح المنتجات</Text>
            </Pressable>
          </View>
        ) : (
          items.map((line) => {
            const title = line.nameAr ?? line.name;
            return (
              <View key={line.productId} style={styles.lineRow}>
                <View style={styles.thumb}>
                  {line.imageUrl ? (
                    <Image
                      source={{ uri: line.imageUrl }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="leaf" size={32} color={colors.brand} />
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
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() =>
                        setQuantity(line.productId, line.quantity - 1)
                      }
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={18} color="#fff" />
                    </Pressable>
                    <Text style={styles.qtyText}>{line.quantity}</Text>
                    <Pressable
                      onPress={() =>
                        setQuantity(line.productId, line.quantity + 1)
                      }
                      style={styles.qtyBtnBrand}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => removeItem(line.productId)}
                      style={styles.trashBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.red500}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الإجمالي</Text>
            <Text style={styles.totalValue}>
              {total.toFixed(2)} QAR
            </Text>
          </View>
          <Pressable style={styles.checkoutBtn}>
            <Text style={styles.checkoutText}>إتمام الطلب</Text>
          </Pressable>
          <Pressable onPress={clear} style={styles.clearBtn}>
            <Text style={styles.clearText}>مسح السلة</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    color: colors.neutral500,
    marginTop: 24,
    fontSize: 18,
    textAlign: "center",
  },
  emptySub: {
    color: colors.neutral600,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  primaryBtn: {
    marginTop: 32,
    backgroundColor: colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: colors.white, fontWeight: "700" },
  lineRow: {
    flexDirection: "row",
    backgroundColor: colors.neutral900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral800,
    marginBottom: 12,
    overflow: "hidden",
  },
  thumb: {
    width: 96,
    height: 96,
    backgroundColor: colors.neutral800,
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
    fontWeight: "600",
    textAlign: "right",
  },
  linePrice: {
    color: colors.brand,
    textAlign: "right",
    fontWeight: "700",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.neutral800,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neutral700,
  },
  qtyBtnBrand: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: colors.white,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
  trashBtn: { marginLeft: 8, padding: 8 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderBrandMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: { color: colors.neutral400 },
  totalValue: { color: colors.white, fontSize: 20, fontWeight: "700" },
  checkoutBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  checkoutText: { color: colors.white, fontWeight: "700", fontSize: 18 },
  clearBtn: { marginTop: 12, paddingVertical: 8, alignItems: "center" },
  clearText: { color: colors.neutral500, fontSize: 14 },
});
