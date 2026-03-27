import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <View style={styles.pad}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Ionicons name="business" size={44} color={colors.brand} />
          </View>
          <Text style={styles.heroTitle}>ماليان للتجارة والحدائق</Text>
          <Text style={styles.heroSub}>نباتات اصطناعية — قطر</Text>
        </View>

        <View style={styles.card}>
          <Row
            icon="leaf-outline"
            label="من نحن"
            onPress={() => Linking.openURL("https://malyan.qa")}
          />
          <Row
            icon="call-outline"
            label="اتصل بنا"
            onPress={() => Linking.openURL("tel:+974")}
          />
          <Row
            icon="logo-instagram"
            label="إنستغرام"
            onPress={() => Linking.openURL("https://instagram.com")}
            last
          />
        </View>

        <Text style={styles.disclaimer}>
          هذا التطبيق لعملاء ماليان. للاستفسارات حول الطلبات والتوصيل، تواصل مع فريق
          الخدمة.
        </Text>
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
      <Ionicons name="chevron-back" size={20} color={colors.neutral500} />
      <View style={styles.rowInner}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Ionicons name={icon} size={22} color={colors.brand} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 24, paddingTop: 16 },
  hero: { alignItems: "center", marginBottom: 40 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandMutedBg,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  heroSub: { color: colors.neutral500, marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: colors.neutral900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral800,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral800 },
  rowPressed: { backgroundColor: colors.neutral800 },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    gap: 12,
  },
  rowLabel: { color: colors.white, fontWeight: "500", fontSize: 16 },
  disclaimer: {
    color: colors.neutral600,
    fontSize: 12,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
});
