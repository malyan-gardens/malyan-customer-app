import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../lib/theme";

type Props = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  tagline?: string;
};

export function MalyanLogo({
  size = "md",
  showTagline = false,
  tagline,
}: Props) {
  const scale = size === "sm" ? 0.85 : size === "lg" ? 1.15 : 1;
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { transform: [{ scale }] }]}>
        <View style={styles.iconRing}>
          <Ionicons name="leaf" size={size === "lg" ? 28 : 22} color={colors.gold} />
        </View>
        <View>
          <Text style={[styles.wordmark, size === "lg" && styles.wordmarkLg]}>
            مليان
          </Text>
          <View style={styles.goldLine} />
        </View>
      </View>
      {showTagline && tagline ? (
        <Text style={styles.tagline}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  wordmarkLg: { fontSize: 40 },
  goldLine: {
    height: 3,
    width: "100%",
    backgroundColor: colors.gold,
    marginTop: 4,
    borderRadius: 2,
    opacity: 0.9,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 22,
  },
});
