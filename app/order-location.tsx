import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { colors, radii, shadows, spacing } from "../lib/theme";
import {
  extractQatarPhoneDigits,
  isValidQatarPhone,
  normalizeQatarPhone,
  QATAR_COUNTRY_CODE,
} from "../lib/customer";

type Mode = "gps" | "manual";

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
  const setPhoneNumber = useCheckoutDraftStore((s) => s.setPhoneNumber);
  const customerPhone = useCheckoutDraftStore((s) => s.customerPhone);

  const [mode, setMode] = useState<Mode>("gps");
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [address, setAddress] = useState("");
  const [geoParts, setGeoParts] = useState<{
    street: string;
    district: string;
    city: string;
  }>({ street: "", district: "", city: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [buildingNo, setBuildingNo] = useState("");
  const [streetNo, setStreetNo] = useState("");
  const [zoneNo, setZoneNo] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [phone, setPhone] = useState("");

  const sanitizeDigits = (value: string) => value.replace(/\D/g, "");

  const resolveLocation = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setCoords(null);
        setAddress("");
        setGeoParts({ street: "", district: "", city: "" });
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
      setAddress(full || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setGeoParts({
        street: geo?.street ?? "",
        district: geo?.district ?? "",
        city: geo?.city ?? "",
      });
    } catch {
      Alert.alert("تنبيه", "تعذر تحديد الموقع. حاول مرة أخرى أو أعد المحاولة من الإعدادات.");
      setCoords(null);
      setAddress("");
      setGeoParts({ street: "", district: "", city: "" });
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
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const profilePhone = normalizeQatarPhone(customerPhone);
        if (profilePhone) {
          setPhone(extractQatarPhoneDigits(profilePhone));
          return;
        }
        const raw = normalizeQatarPhone(user?.phone?.trim() ?? "");
        if (raw) {
          setPhone(extractQatarPhoneDigits(raw));
        }
      } catch {
        // Keep manual phone entry if profile fetch fails.
      }
    })();
  }, [customerPhone, orderLines.length, router]);

  useEffect(() => {
    if (orderLines.length === 0) return;
    if (mode === "gps") {
      void resolveLocation();
    }
  }, [mode, orderLines.length, resolveLocation]);

  const onConfirm = () => {
    const normalizedPhone = normalizeQatarPhone(phone);
    if (!isValidQatarPhone(normalizedPhone)) {
      Alert.alert("تنبيه", "الرقم يجب أن يكون بهذا الشكل: +974XXXXXXXX");
      return;
    }

    if (mode === "gps") {
      if (!coords) {
        Alert.alert("تنبيه", "يرجى السماح بتحديد الموقع أولاً.");
        return;
      }
      const finalAddress = address.trim() || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      setLocationStep(coords.lat, coords.lng, finalAddress);
      setPhoneNumber(normalizedPhone);
      router.push("/payment-options" as never);
      return;
    }

    if (!buildingNo.trim() || !streetNo.trim() || !zoneNo.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال رقم المبنى والشارع والمنطقة.");
      return;
    }
    const notes = manualNotes.trim();
    const finalManualAddress = notes
      ? `مبنى ${buildingNo.trim()}، شارع ${streetNo.trim()}، منطقة ${zoneNo.trim()}، ${notes}`
      : `مبنى ${buildingNo.trim()}، شارع ${streetNo.trim()}، منطقة ${zoneNo.trim()}`;
    setLocationStep(0, 0, finalManualAddress);
    setPhoneNumber(normalizedPhone);
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
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.tabBtn, mode === "gps" ? styles.tabBtnActive : styles.tabBtnInactive]}
              onPress={() => setMode("gps")}
            >
              <Text style={[styles.tabText, mode === "gps" ? styles.tabTextActive : styles.tabTextInactive]}>
                موقعي الحالي 📍
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, mode === "manual" ? styles.tabBtnActive : styles.tabBtnInactive]}
              onPress={() => setMode("manual")}
            >
              <Text
                style={[styles.tabText, mode === "manual" ? styles.tabTextActive : styles.tabTextInactive]}
              >
                إدخال يدوي ✏️
              </Text>
            </Pressable>
          </View>

          {mode === "gps" ? (
            <View style={styles.card}>
              <View style={styles.centerBlock}>
                <Ionicons name="location" size={48} color={colors.brand} />
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.gold} />
                    <Text style={styles.hint}>جاري تحديد موقعك…</Text>
                  </>
                ) : permissionDenied ? (
                  <Text style={styles.errorText}>تم رفض إذن الموقع. فعّل الإذن ثم أعد المحاولة.</Text>
                ) : coords ? (
                  <Text style={styles.hint}>تم تحديد موقعك بنجاح.</Text>
                ) : (
                  <Text style={styles.errorText}>تعذر تحديد الموقع حالياً.</Text>
                )}
              </View>

              {(geoParts.street || geoParts.district || geoParts.city || address) && (
                <View style={styles.addrCard}>
                  <Text style={styles.addrLabel}>العنوان المكتشف</Text>
                  {geoParts.street ? <Text style={styles.addrText}>الشارع: {geoParts.street}</Text> : null}
                  {geoParts.district ? (
                    <Text style={styles.addrText}>الحي: {geoParts.district}</Text>
                  ) : null}
                  {geoParts.city ? <Text style={styles.addrText}>المدينة: {geoParts.city}</Text> : null}
                  {address ? <Text style={styles.coordsMuted}>{address}</Text> : null}
                </View>
              )}

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => void resolveLocation()}
                disabled={refreshing}
              >
                <Text style={styles.secondaryBtnText}>
                  {refreshing ? "جاري التحديث…" : "تحديث الموقع"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>العنوان اليدوي</Text>

              <Text style={styles.inputLabel}>رقم المبنى</Text>
              <TextInput
                value={buildingNo}
                onChangeText={(v) => setBuildingNo(sanitizeDigits(v))}
                keyboardType="number-pad"
                style={styles.input}
                textAlign="right"
                maxLength={10}
                placeholder="مثال: 12"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>رقم الشارع</Text>
              <TextInput
                value={streetNo}
                onChangeText={(v) => setStreetNo(sanitizeDigits(v))}
                keyboardType="number-pad"
                style={styles.input}
                textAlign="right"
                maxLength={10}
                placeholder="مثال: 34"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>رقم المنطقة</Text>
              <TextInput
                value={zoneNo}
                onChangeText={(v) => setZoneNo(sanitizeDigits(v))}
                keyboardType="number-pad"
                style={styles.input}
                textAlign="right"
                maxLength={10}
                placeholder="مثال: 56"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>ملاحظات إضافية</Text>
              <TextInput
                value={manualNotes}
                onChangeText={setManualNotes}
                style={[styles.input, styles.notesInput]}
                textAlign="right"
                multiline
                placeholder="الدور، رقم الشقة، معلم قريب..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.phoneLabel}>رقم التلفون</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.prefix}>{QATAR_COUNTRY_CODE}</Text>
              <TextInput
                value={phone}
                onChangeText={(v) => setPhone(sanitizeDigits(v).slice(0, 8))}
                keyboardType="number-pad"
                style={styles.phoneInput}
                textAlign="right"
                maxLength={8}
                placeholder="XXXXXXXX"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={onConfirm}
            disabled={loading}
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
  modeTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.brand },
  tabBtnInactive: { backgroundColor: colors.surface },
  tabText: { fontSize: 14, fontWeight: "800" },
  tabTextActive: { color: colors.white },
  tabTextInactive: { color: colors.textMuted },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  addrCard: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    fontSize: 14,
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 4,
  },
  coordsMuted: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  centerBlock: {
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: 12,
  },
  hint: { color: colors.textMuted, marginTop: 4, textAlign: "center" },
  errorText: {
    color: colors.red400,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  secondaryBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  secondaryBtnText: { color: colors.gold, fontWeight: "800" },
  inputLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.bgElevated,
    color: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  phoneLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  prefix: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 18,
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    textAlign: "right",
  },
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
