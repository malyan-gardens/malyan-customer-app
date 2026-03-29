import { Platform, StyleSheet } from "react-native";

/** Premium Malyan customer app — dark + green + gold */
export const colors = {
  bg: "#0a0a0a",
  bgElevated: "#111111",
  surface: "#141414",
  surfaceHover: "#1a1a1a",
  border: "#262626",
  borderLight: "#333333",
  brand: "#1a7a3c",
  brandDark: "#145e2f",
  brandMuted: "rgba(26, 122, 60, 0.25)",
  gold: "#c9a84c",
  goldMuted: "rgba(201, 168, 76, 0.2)",
  white: "#ffffff",
  textPrimary: "#ffffff",
  textSecondary: "#a3a3a3",
  textMuted: "#737373",
  googleRed: "#DB4437",
  appleBlack: "#000000",
  red400: "#f87171",
  red500: "#ef4444",
  overlay: "rgba(0,0,0,0.55)",
  /** Legacy aliases used in older screens */
  neutral900: "#141414",
  neutral800: "#262626",
  neutral700: "#404040",
  neutral600: "#525252",
  neutral500: "#737373",
  neutral400: "#a3a3a3",
  neutral300: "#d4d4d4",
  borderBrandMuted: "rgba(26, 122, 60, 0.45)",
  brandMutedBg: "rgba(26, 122, 60, 0.22)",
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  /** Prefer system Arabic-capable fonts */
  title: { fontSize: 26, fontWeight: "800" as const },
  headline: { fontSize: 20, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    android: { elevation: 10 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
    default: {},
  }),
  goldGlow: Platform.select({
    ios: {
      shadowColor: "#c9a84c",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    default: {},
  }),
};

export const screenPadding = spacing.md;

export const themeStyles = StyleSheet.create({
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
