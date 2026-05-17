import { fonts } from "./fonts";

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

export const lineHeight = {
  tight: 18,
  base: 20,
  relaxed: 24,
  loose: 28,
} as const;

export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.5,
  wider: 0.8,
  widest: 1.2,
} as const;

// Playfair Display — display text
export const display = {
  title: {
    fontFamily: fonts.playfair.bold,
    fontSize: fontSize.xxl,
    lineHeight: lineHeight.loose,
    letterSpacing: letterSpacing.tight,
  },
  heading: {
    fontFamily: fonts.playfair.semibold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.relaxed,
  },
  subheading: {
    fontFamily: fonts.playfair.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.relaxed,
  },
  noteTitle: {
    fontFamily: fonts.playfair.bold,
    fontSize: fontSize.xxxl,
    lineHeight: 36,
    letterSpacing: letterSpacing.tight,
  },
  cardTitle: {
    fontFamily: fonts.playfair.semibold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.relaxed,
  },
  brandName: {
    fontFamily: fonts.playfair.bold,
    fontSize: fontSize.xl,
    letterSpacing: letterSpacing.wide,
  },
} as const;

// Inter — UI and body text
export const ui = {
  body: {
    fontFamily: fonts.inter.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.relaxed,
  },
  bodyMd: {
    fontFamily: fonts.inter.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.base,
  },
  secondary: {
    fontFamily: fonts.inter.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  muted: {
    fontFamily: fonts.inter.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.base,
  },
  label: {
    fontFamily: fonts.inter.medium,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.widest,
    textTransform: "uppercase" as const,
  },
  caption: {
    fontFamily: fonts.inter.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.tight,
  },
  button: {
    fontFamily: fonts.inter.medium,
    fontSize: fontSize.md,
  },
  tag: {
    fontFamily: fonts.inter.medium,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
  },
  navTitle: {
    fontFamily: fonts.inter.semibold,
    fontSize: fontSize.lg,
  },
  navAction: {
    fontFamily: fonts.inter.medium,
    fontSize: fontSize.base,
  },
  sectionLabel: {
    fontFamily: fonts.inter.medium,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.widest,
    textTransform: "uppercase" as const,
  },
  accentText: {
    fontFamily: fonts.inter.medium,
    fontSize: fontSize.base,
  },
  codeInput: {
    fontFamily: fonts.inter.regular,
    fontSize: fontSize.xxxl,
    lineHeight: 34,
    letterSpacing: 12,
    textAlign: "center" as const,
  },
} as const;
