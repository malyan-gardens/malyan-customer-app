import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { colors, radii, shadows, spacing } from "../lib/theme";

function staticMapUri(latitude: number, longitude: number) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=16&size=600x280&markers=${latitude},${longitude},red-pushpin`;
}

function formatGeocodedAddress(
  a: Location.LocationGeocodedAddress | null | undefined
): string {
  if (!a) return "";
  const parts = [a.street, a.district, a.city, a.region, a.country].filter(
    Boolean
  ) as string[];
  return parts.join(", ");
}

export default function OrderLocationScreen() {
  const router = useRouter();
  const orderLines = useCheckoutDraftStore((s) => s.orderLines);
  const setLocationStep = useCheckoutDraftStore((s) => s.setLocationStep);

  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [address, setAddress] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const resolveLocation = useCallback(async () => {
    setRefreshing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setCoords(null);
        setAddress("");
        return;
      }
      setPermissionDenied(false);
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      setCoords({ lat, lng });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      const full = formatGeocodedAddress(geo);
      setAddress(
        full || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      );
    } catch {
      Alert.alert("تنبيه", "تعذر تحديد الموقع. حاول مرة أخرى أو أعد المحاولة من الإعدادات.");
      setCoords(null);
      setAddress("");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (orderLines.length === 0) {
      router.replace("/checkout");
      return;
    }
    void resolveLocation();
  }, [orderLines.length, resolveLocation, router]);

  const onConfirm = () => {
    if (!coords || !address.trim()) {
      Alert.alert("تنبيه", "يرجى السماح بتحديد الموقع أولاً.");
      return;
    }
    setLocationStep(coords.lat, coords.lng, address.trim());
    router.push("/payment-options" as never);
  };

  if (orderLines.length === 0) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: "موقع التوصيل" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            نحتاج موقع التوصيل الدقيق لإيصال طلبك. يُرجى السماح بالوصول إلى الموقع.
          </Text>

          {loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.hint}>جاري تحديد موقعك…</Text>
            </View>
          ) : permissionDenied ? (
            <View style={styles.centerBlock}>
              <Ionicons name="location-outline" size={48} color={colors.red400} />
              <Text style={styles.errorText}>
                تم رفض إذن الموقع. فعّل الموقع من إعدادات التطبيق ثم أعد المحاولة.
              </Text>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => void resolveLocation()}
              >
                <Text style={styles.secondaryBtnText}>إعادة طلب الإذن</Text>
              </Pressable>
            </View>
          ) : coords ? (
            <>
              <Text style={styles.sectionTitle}>معاينة موقع التوصيل</Text>
              <Image
                source={{ uri: staticMapUri(coords.lat, coords.lng) }}
                style={styles.map}
                resizeMode="cover"
                accessibilityLabel="خريطة موقع التوصيل"
              />
              <View style={styles.addrCard}>
                <Text style={styles.addrLabel}>العنوان المقترح</Text>
                <Text style={styles.addrText}>{address}</Text>
                <Text style={styles.coordsMuted}>
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </Text>
              </View>
              <Pressable
                style={styles.linkBtn}
                onPress={() => void resolveLocation()}
                disabled={refreshing}
              >
                <Ionicons name="refresh" size={18} color={colors.gold} />
                <Text style={styles.linkBtnText}>
                  {refreshing ? "جاري التحديث…" : "تحديث الموقع"}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>تعذر عرض الخريطة.</Text>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => void resolveLocation()}
              >
                <Text style={styles.secondaryBtnText}>حاول مجدداً</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[
              styles.primaryBtn,
              (!coords || !address.trim() || loading) && styles.primaryBtnDisabled,
            ]}
            onPress={onConfirm}
            disabled={!coords || !address.trim() || loading}
          >
            <Text style={styles.primaryBtnText}>متابعة لخيارات الدفع</Text>
            <Ionicons name="arrow-back" size={20} color={colors.bg} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 40 },
  lead: {
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 24,
    marginBottom: spacing.lg,
    fontSize: 15,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  map: {
    width: "100%",
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addrCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addrLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  addrText: {
    color: colors.white,
    fontSize: 15,
    textAlign: "right",
    lineHeight: 24,
  },
  coordsMuted: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 10,
  },
  linkBtnText: { color: colors.gold, fontWeight: "700", fontSize: 15 },
  centerBlock: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: 12,
  },
  hint: { color: colors.textMuted, marginTop: 12 },
  errorText: {
    color: colors.red400,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  secondaryBtnText: { color: colors.gold, fontWeight: "800" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    ...shadows.goldGlow,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: colors.bg, fontWeight: "800", fontSize: 17 },
});
