import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MalyanLogo } from "../../components/MalyanLogo";
import { CONTACT } from "../../lib/contact";
import { supabase } from "../../lib/supabase";
import { colors, radii, shadows, spacing } from "../../lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("مستخدم مليان");
  const [email, setEmail] = useState(CONTACT.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!mounted || !user) return;

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const maybeName =
        (typeof metadata.full_name === "string" && metadata.full_name) ||
        (typeof metadata.name === "string" && metadata.name) ||
        user.email ||
        "مستخدم مليان";
      const maybeAvatar =
        (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
        (typeof metadata.picture === "string" && metadata.picture) ||
        null;

      setDisplayName(maybeName);
      setEmail(user.email ?? CONTACT.email);
      setAvatarUrl(maybeAvatar);
    };
    void loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد المغادرة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pad}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <View style={styles.avatarInner}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={36} color={colors.gold} />
              )}
            </View>
          </View>
          <Text style={styles.heroTitle}>{displayName}</Text>
          <Text style={styles.heroSub}>{email}</Text>
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
        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="log-out-outline" size={22} color="#ffffff" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
        </View>
      </ScrollView>
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
  scrollContent: { paddingBottom: spacing.xl },
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
  avatarImage: { width: "100%", height: "100%", borderRadius: 48 },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  heroSub: {
    color: colors.gold,
    marginTop: 6,
    textAlign: "center",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  blockTitle: {
    color: "#c9a84c",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
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
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  contactValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
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
  rowLabel: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: spacing.md,
    paddingVertical: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "#ef4444",
  },
  logoutText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
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
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  footerLink: {
    color: colors.gold,
    fontWeight: "700",
    fontSize: 15,
    textDecorationLine: "underline",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  footerLinkMuted: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  copyright: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
});
