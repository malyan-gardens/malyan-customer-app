import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MalyanLogo } from "../../components/MalyanLogo";
import { CONTACT } from "../../lib/contact";
import { setSession } from "../../lib/authStorage";
import { colors, radii, shadows, spacing } from "../../lib/theme";

export default function ProfileScreen() {
  const router = useRouter();

  const logout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد المغادرة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await setSession(false);
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.pad}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={36} color={colors.gold} />
            </View>
          </View>
          <Text style={styles.heroTitle}>زائر مليان</Text>
          <Text style={styles.heroSub}>{CONTACT.email}</Text>
        </View>

        <View style={styles.card}>
          <Row
            icon="bag-handle-outline"
            label="طلباتي"
            onPress={() =>
              Alert.alert("قريباً", "سيتم ربط الطلبات بجدول orders في Supabase.")
            }
          />
          <Row
            icon="calendar-outline"
            label="مواعيدي"
            onPress={() =>
              Alert.alert("قريباً", "سيتم ربط المواعيد بجدول appointments.")
            }
          />
          <Row
            icon="notifications-outline"
            label="إعدادات الإشعارات"
            onPress={() =>
              Alert.alert("قريباً", "تفضيلات الإشعارات قيد التطوير.")
            }
            last
          />
        </View>

        <Text style={styles.blockTitle}>اتصل بنا</Text>
        <View style={styles.card}>
          <ContactRow
            icon="mail-outline"
            label="البريد"
            value={CONTACT.email}
            onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}
          />
          <ContactRow
            icon="call-outline"
            label="الهاتف"
            value={CONTACT.phoneDisplay}
            onPress={() => Linking.openURL(`tel:${CONTACT.phoneTel}`)}
          />
          <ContactRow
            icon="globe-outline"
            label="الموقع"
            value={CONTACT.websiteDisplay}
            onPress={() => Linking.openURL(CONTACT.website)}
          />
          <ContactRow
            icon="logo-instagram"
            label="إنستغرام"
            value="@malyangardens"
            onPress={() => Linking.openURL(CONTACT.instagram)}
            last
          />
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.red400} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>

        <View style={styles.footer}>
          <MalyanLogo size="lg" />
          <Text style={styles.footerTag}>Malyan Gardens</Text>
          <Pressable onPress={() => Linking.openURL(CONTACT.website)}>
            <Text style={styles.footerLink}>{CONTACT.websiteDisplay}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(CONTACT.instagram)}>
            <Text style={styles.footerLinkMuted}>إنستغرام</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}>
            <Text style={styles.footerLinkMuted}>{CONTACT.email}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`tel:${CONTACT.phoneTel}`)}>
            <Text style={styles.footerLinkMuted}>{CONTACT.phoneDisplay}</Text>
          </Pressable>
          <Text style={styles.copyright}>Copyright © 2025 Malyan Gardens</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
      <View style={styles.rowInner}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Ionicons name={icon} size={22} color={colors.gold} />
      </View>
    </Pressable>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactRow,
        !last && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <Ionicons name="open-outline" size={18} color={colors.gold} />
      <View style={styles.contactBody}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <Ionicons name={icon} size={22} color={colors.gold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  hero: { alignItems: "center", marginBottom: spacing.lg },
  avatar: {
    padding: 3,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: 16,
    ...shadows.goldGlow,
  },
  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSub: { color: colors.textMuted, marginTop: 6, textAlign: "center" },
  blockTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactBody: { flex: 1, alignItems: "flex-end" },
  contactLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  contactValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowPressed: { backgroundColor: colors.bgElevated },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    gap: 12,
  },
  rowLabel: { color: colors.white, fontWeight: "600", fontSize: 16 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: spacing.sm,
    paddingVertical: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  logoutText: { color: colors.red400, fontWeight: "800", fontSize: 16 },
  footer: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: 32,
    gap: 10,
  },
  footerTag: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  footerLink: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  footerLinkMuted: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  copyright: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});
