import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../lib/theme";

type GuestModalProps = {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
};

export function GuestModal({ visible, onClose, onLogin }: GuestModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <Ionicons name="leaf" size={48} color={colors.brand} style={styles.icon} />
          <Text style={styles.title}>سجل دخولك للمتابعة</Text>
          <Text style={styles.sub}>استمتع بكامل ميزات مليان للحدائق</Text>
          <Pressable
            onPress={onLogin}
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.btnPrimaryText}>تسجيل الدخول</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.btnOutline, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.btnOutlineText}>تصفح كضيف</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  icon: { marginBottom: 4 },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    alignSelf: "stretch",
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    alignSelf: "stretch",
    lineHeight: 22,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  btnPrimary: {
    alignSelf: "stretch",
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.brandDark,
    marginTop: 4,
  },
  btnPrimaryText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
  btnOutline: {
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: "transparent",
  },
  btnOutlineText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
    fontFamily: Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined }),
  },
});
