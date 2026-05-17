// Teal Breeze palette
export const teal = {
  primary: "#14BBA6",
  light: "#CCFBF1",
  pale: "#F0FDFA",
};

export const slate = {
  900: "#0F172A",
  800: "#1E293B",
  700: "#334155",
  600: "#475569",
  500: "#64748B",
  400: "#94A3B8",
  300: "#CBD5E1",
  200: "#E2E8F0",
  100: "#F1F5F9",
  50: "#F8FAFC",
};

// ─── Theme type ───────────────────────────────────────────────────────
// Defined explicitly so light and dark are both assignable to it
export type Theme = {
  // Surfaces
  appBg: string;
  base: string;
  raised: string;
  overlay: string;
  sunken: string;
  card: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textDisabled: string;

  // Accent
  accentPrimary: string;
  accentSecondary: string;
  accentHighlight: string;
  accentSubtle: string;
  accentText: string;

  // Borders
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderAccent: string;

  // Semantic
  successBg: string;
  success: string;
  warningBg: string;
  warning: string;
  errorBg: string;
  error: string;
  infoBg: string;
  info: string;

  // Shadow
  shadow: string;
};

// ─── Light theme ──────────────────────────────────────────────────────
export const light: Theme = {
  appBg: "#F8FAFC",
  base: "#FFFFFF",
  raised: "#FFFFFF",
  overlay: "#F1F5F9",
  sunken: "#F8FAFC",
  card: "#FFFFFF",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",
  textDisabled: "#CBD5E1",

  accentPrimary: "#14BBA6",
  accentSecondary: "#0D9488",
  accentHighlight: "#14BBA6",
  accentSubtle: "#CCFBF1",
  accentText: "#0F172A",

  borderSubtle: "#F1F5F9",
  borderDefault: "#E2E8F0",
  borderStrong: "#CBD5E1",
  borderAccent: "#14BBA6",

  successBg: "#F0FDF4",
  success: "#16A34A",
  warningBg: "#FFFBEB",
  warning: "#D97706",
  errorBg: "#FEF2F2",
  error: "#DC2626",
  infoBg: "#F0FDFA",
  info: "#14BBA6",

  shadow: "rgba(15, 23, 42, 0.08)",
};

// ─── Dark theme ───────────────────────────────────────────────────────
export const dark: Theme = {
  appBg: "#0A0F1E",
  base: "#0F172A",
  raised: "#1E293B",
  overlay: "#263348",
  sunken: "#080D1A",
  card: "#1E293B",

  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#64748B",
  textInverse: "#0F172A",
  textDisabled: "#334155",

  accentPrimary: "#14BBA6",
  accentSecondary: "#2DD4BF",
  accentHighlight: "#5EEAD4",
  accentSubtle: "#134E4A",
  accentText: "#F8FAFC",

  borderSubtle: "#1E293B",
  borderDefault: "#263348",
  borderStrong: "#334155",
  borderAccent: "#14BBA6",

  successBg: "#052E16",
  success: "#4ADE80",
  warningBg: "#1C1400",
  warning: "#FCD34D",
  errorBg: "#1A0000",
  error: "#F87171",
  infoBg: "#042F2E",
  info: "#2DD4BF",

  shadow: "rgba(0, 0, 0, 0.4)",
};
