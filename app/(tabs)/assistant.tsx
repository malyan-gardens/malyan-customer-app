import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CONTACT } from "../../lib/contact";
import { colors, radii, shadows, spacing } from "../../lib/theme";

export default function AssistantTabScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.wrap}>
        <Text style={styles.title}>💬 تواصل معنا</Text>
        <Text style={styles.sub}>
          لأي استفسار عن المنتجات أو الصيانة، تواصل معنا مباشرة.
        </Text>

        <Pressable style={styles.primaryBtn} onPress={() => Linking.openURL(CONTACT.instagram)}>
          <Ionicons name="logo-instagram" size={20} color={colors.bg} />
          <Text style={styles.primaryText}>محادثة عبر إنستغرام</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => Linking.openURL(`tel:${CONTACT.phoneTel}`)}>
          <Ionicons name="call" size={20} color={colors.gold} />
          <Text style={styles.secondaryText}>{CONTACT.phoneDisplay}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push("/maintenance")}
        >
          <Ionicons name="construct" size={20} color={colors.gold} />
          <Text style={styles.secondaryText}>طلب خدمة صيانة</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  sub: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    paddingVertical: 16,
    ...shadows.goldGlow,
    marginBottom: 12,
  },
  primaryText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    marginBottom: 10,
    ...shadows.soft,
  },
  secondaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  sendBtnDisabled: {
    justifyContent: "center",
  },
});
