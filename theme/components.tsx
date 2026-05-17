import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
} from "react-native";
import { radius, spacing } from "./spacing";
import { display, ui } from "./typography";
import { useTheme } from "./ThemeContext";

// ─── Text ─────────────────────────────────────────────────────────────

type TextVariant =
  | "title"
  | "heading"
  | "subheading"
  | "noteTitle"
  | "cardTitle"
  | "brandText"
  | "body"
  | "bodyMd"
  | "secondary"
  | "muted"
  | "label"
  | "caption"
  | "accentText"
  | "sectionLabel";

type ThemedTextProps = TextProps & { variant?: TextVariant };

export function Text({ variant = "body", style, ...props }: ThemedTextProps) {
  const { theme } = useTheme();

  const variantStyle = {
    title: { ...display.title, color: theme.textPrimary },
    heading: { ...display.heading, color: theme.textPrimary },
    subheading: { ...display.subheading, color: theme.textPrimary },
    noteTitle: { ...display.noteTitle, color: theme.textPrimary },
    cardTitle: { ...display.cardTitle, color: theme.textPrimary },
    brandText: { ...display.brandName, color: theme.accentPrimary },
    body: { ...ui.body, color: theme.textPrimary },
    bodyMd: { ...ui.bodyMd, color: theme.textPrimary },
    secondary: { ...ui.secondary, color: theme.textSecondary },
    muted: { ...ui.muted, color: theme.textMuted },
    label: { ...ui.label, color: theme.textMuted },
    caption: { ...ui.caption, color: theme.textMuted },
    accentText: { ...ui.accentText, color: theme.accentHighlight },
    sectionLabel: { ...ui.sectionLabel, color: theme.textMuted },
  }[variant];

  return <RNText style={[variantStyle, style]} {...props} />;
}

// ─── Button ───────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type ThemedButtonProps = TouchableOpacityProps & {
  variant?: ButtonVariant;
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  label,
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ThemedButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      container: {
        backgroundColor: isDisabled ? theme.borderStrong : theme.accentPrimary,
        borderRadius: radius.md,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      text: {
        ...ui.button,
        color: isDisabled ? theme.textMuted : theme.textInverse,
      },
    },
    secondary: {
      container: {
        backgroundColor: "transparent",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.accentPrimary,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      text: {
        ...ui.button,
        color: theme.accentPrimary,
      },
    },
    ghost: {
      container: {
        backgroundColor: "transparent",
        borderRadius: radius.md,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      text: {
        ...ui.button,
        color: theme.textMuted,
      },
    },
    destructive: {
      container: {
        backgroundColor: theme.errorBg,
        borderRadius: radius.md,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      text: {
        ...ui.button,
        color: theme.error,
      },
    },
  }[variant];

  return (
    <TouchableOpacity
      style={[
        variantStyles.container,
        fullWidth && { width: "100%" as const },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" ? theme.textInverse : theme.accentPrimary
          }
          size="small"
        />
      ) : (
        <RNText style={variantStyles.text}>{label}</RNText>
      )}
    </TouchableOpacity>
  );
}

// ─── TextInput ────────────────────────────────────────────────────────

type ThemedInputProps = TextInputProps & {
  label?: string;
  error?: boolean;
  inputStyle?: TextInputProps["style"];
  containerStyle?: ViewProps["style"];
};

export function TextInput({
  label,
  error,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}: ThemedInputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label && (
        <RNText
          style={[
            ui.label,
            { color: theme.textMuted, marginBottom: spacing[1] },
          ]}
        >
          {label}
        </RNText>
      )}
      <RNTextInput
        style={[
          {
            ...ui.bodyMd,
            backgroundColor: theme.sunken,
            borderWidth: 1,
            borderColor: error
              ? theme.error
              : focused
                ? theme.accentPrimary
                : theme.borderDefault,
            borderRadius: radius.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            color: theme.textPrimary,
          },
          inputStyle,
        ]}
        placeholderTextColor={theme.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────

type ThemedCardProps = ViewProps & { pressed?: boolean };

export function Card({ pressed, style, ...props }: ThemedCardProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: theme.borderDefault,
          padding: spacing[4],
          shadowColor: theme.shadow,
          shadowOpacity: 1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        pressed && { backgroundColor: theme.overlay },
        style,
      ]}
      {...props}
    />
  );
}

// ─── Badge ────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "error";

type BadgeProps = {
  label: string;
  active?: boolean;
  variant?: BadgeVariant;
  onPress?: () => void;
};

export function Badge({
  label,
  active,
  variant = "default",
  onPress,
}: BadgeProps) {
  const { theme } = useTheme();

  const variantStyle = {
    success: { bg: theme.successBg, color: theme.success },
    warning: { bg: theme.warningBg, color: theme.warning },
    error: { bg: theme.errorBg, color: theme.error },
    default: null,
  }[variant];

  const content = (
    <View
      style={[
        {
          backgroundColor: active
            ? theme.accentPrimary
            : (variantStyle?.bg ?? theme.accentSubtle),
          paddingHorizontal: spacing[3],
          paddingVertical: 4,
          borderRadius: radius.full,
        },
      ]}
    >
      <RNText
        style={[
          ui.tag,
          {
            color: active
              ? theme.textInverse
              : (variantStyle?.color ?? theme.accentPrimary),
          },
        ]}
      >
        {label}
      </RNText>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ─── Divider ──────────────────────────────────────────────────────────

export function Divider({ style }: ViewProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          height: 0.5,
          backgroundColor: theme.borderSubtle,
          marginVertical: spacing[4],
        },
        style,
      ]}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────

export function Screen({ style, ...props }: ViewProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[{ flex: 1, backgroundColor: theme.appBg }, style]}
      {...props}
    />
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────

type ProgressBarProps = {
  progress: Animated.AnimatedInterpolation<string | number>;
};

export function ProgressBar({ progress }: ProgressBarProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: "100%",
        height: 4,
        backgroundColor: theme.borderDefault,
        borderRadius: radius.full,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height: "100%",
          width: progress,
          backgroundColor: theme.accentPrimary,
          borderRadius: radius.full,
        }}
      />
    </View>
  );
}
