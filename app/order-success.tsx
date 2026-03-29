import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../lib/theme";

export default function OrderSuccessScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "تم بنجاح", headerBackVisible: false }} />
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <View style={styles.inner}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={72} color={colors.gold} />
          </View>
          <Text style={styles.title}>تم استلام طلبك! سنتواصل معك قريباً ✓</Text>
          <Text style={styles.sub}>
            شكراً لثقتك بمليان للحدائق. سيقوم فريقنا بمراجعة الطلب والتواصل معك.
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={styles.btnText}>العودة للرئيسية</Text>
            <Ionicons name="home" size={20} color={colors.bg} />
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    marginBottom: 24,
    ...shadows.goldGlow,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 16,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radii.lg,
    ...shadows.goldGlow,
  },
  btnText: { color: colors.bg, fontWeight: "800", fontSize: 17 },
});
