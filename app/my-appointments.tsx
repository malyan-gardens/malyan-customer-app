import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  extractQatarPhoneDigits,
  normalizeQatarPhone,
  QATAR_COUNTRY_CODE,
} from "../lib/customer";
import { supabase } from "../lib/supabase";
import { colors, radii, shadows, spacing } from "../lib/theme";

type Appointment = {
  id: string;
  serviceType: string;
  dateText: string;
  status: string;
};

function appointmentStatusAr(status: string): string {
  const value = status.trim().toLowerCase();
  if (value === "done") return "منفذ";
  if (value === "in_progress") return "قيد التنفيذ";
  if (value === "cancelled") return "ملغي";
  return "طلب جديد";
}

function buildPhoneVariants(rawPhone: string): string[] {
  const normalized = normalizeQatarPhone(rawPhone);
  if (!normalized) return [];
  const digits = extractQatarPhoneDigits(normalized);
  return Array.from(new Set([normalized, digits, `${QATAR_COUNTRY_CODE}${digits}`]));
}

export default function MyAppointmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAppointments([]);
        setLoading(false);
        return;
      }
      let profilePhone = "";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .maybeSingle();
        profilePhone = normalizeQatarPhone(
          String((profile as { phone?: string } | null)?.phone ?? "")
        );
      } catch {
        profilePhone = "";
      }
      const authPhone = normalizeQatarPhone(user.phone);
      const variants = buildPhoneVariants(profilePhone || authPhone);
      let maintenanceRes;
      let designRes;
      try {
        const [maintenanceByPhone, maintenanceById, designByPhone, designById] = await Promise.all(
          [
            supabase
              .from("maintenance_requests")
              .select("id,service_type,scheduled_date,status,created_at")
              .in("customer_phone", variants.length > 0 ? variants : [""]),
            supabase
              .from("maintenance_requests")
              .select("id,service_type,scheduled_date,status,created_at")
              .eq("customer_id", user.id),
            supabase
              .from("design_requests")
              .select("id,project_type,created_at,status")
              .in("customer_phone", variants.length > 0 ? variants : [""]),
            supabase
              .from("design_requests")
              .select("id,project_type,created_at,status")
              .eq("customer_id", user.id),
          ]
        );
        if (maintenanceByPhone.error || maintenanceById.error || designByPhone.error || designById.error) {
          throw new Error("query_by_customer_id_failed");
        }
        const mergedMaintenance = [
          ...((maintenanceByPhone.data ?? []) as Record<string, unknown>[]),
          ...((maintenanceById.data ?? []) as Record<string, unknown>[]),
        ];
        const mergedDesign = [
          ...((designByPhone.data ?? []) as Record<string, unknown>[]),
          ...((designById.data ?? []) as Record<string, unknown>[]),
        ];
        maintenanceRes = { data: mergedMaintenance, error: null };
        designRes = { data: mergedDesign, error: null };
      } catch {
        [maintenanceRes, designRes] = await Promise.all([
          supabase
            .from("maintenance_requests")
            .select("id,service_type,scheduled_date,status,created_at")
            .in("customer_phone", variants.length > 0 ? variants : [""])
            .order("created_at", { ascending: false }),
          supabase
            .from("design_requests")
            .select("id,project_type,created_at,status")
            .in("customer_phone", variants.length > 0 ? variants : [""])
            .order("created_at", { ascending: false }),
        ]);
      }

      if (maintenanceRes.error) throw maintenanceRes.error;
      if (designRes.error) throw designRes.error;

      const maintenanceRows = ((maintenanceRes.data ?? []) as Record<string, unknown>[]).map(
        (row) => ({
          id: String(row.id),
          serviceType: `صيانة - ${String(row.service_type ?? "خدمة صيانة")}`,
          dateText: String(row.scheduled_date ?? row.created_at ?? "—"),
          status: String(row.status ?? "pending"),
        })
      );

      const designRows = ((designRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        serviceType: `تصميم - ${String(row.project_type ?? "طلب تصميم")}`,
        dateText: String(row.created_at ?? "—").slice(0, 10),
        status: String(row.status ?? "new"),
      }));

      const merged = [...maintenanceRows, ...designRows]
        .filter(
          (row, idx, arr) => arr.findIndex((x) => x.id === row.id && x.serviceType === row.serviceType) === idx
        )
        .sort((a, b) =>
        b.dateText.localeCompare(a.dateText)
      );
      setAppointments(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر جلب المواعيد.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  return (
    <>
      <Stack.Screen options={{ title: "مواعيدي" }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={colors.gold} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : appointments.length === 0 ? (
            <Text style={styles.muted}>لا توجد مواعيد مرتبطة بحسابك حالياً.</Text>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.card}>
                <Text style={styles.row}>نوع الخدمة: {appointment.serviceType}</Text>
                <Text style={styles.row}>التاريخ: {appointment.dateText}</Text>
                <Text style={styles.row}>الحالة: {appointmentStatusAr(appointment.status)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: 44, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  row: { color: colors.white, textAlign: "right", marginBottom: 6 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  error: { color: colors.red400, textAlign: "center", marginTop: 40 },
});
