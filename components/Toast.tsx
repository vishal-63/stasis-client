import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing, ui, useTheme } from "../theme";
import { Text } from "../theme/components";

// ─── Types ────────────────────────────────────────────────────────────

export type ToastType = "success" | "warning" | "error" | "info";

export type ToastConfig = {
  message: string;
  type?: ToastType;
  duration?: number; // ms — default 3000, 0 = persist until dismissed
  description?: string; // optional sub-text
  action?: {
    label: string;
    onPress: () => void;
  };
};

// ─── Toast emitter (no context needed) ───────────────────────────────

type ToastListener = (config: ToastConfig) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  show: (config: ToastConfig) => {
    listeners.forEach((l) => l(config));
  },
  success: (message: string, opts?: Partial<ToastConfig>) => {
    toast.show({ ...opts, message, type: "success" });
  },
  warning: (message: string, opts?: Partial<ToastConfig>) => {
    toast.show({ ...opts, message, type: "warning" });
  },
  error: (message: string, opts?: Partial<ToastConfig>) => {
    toast.show({ ...opts, message, type: "error" });
  },
  info: (message: string, opts?: Partial<ToastConfig>) => {
    toast.show({ ...opts, message, type: "info" });
  },
};

// ─── Individual toast item ────────────────────────────────────────────

type ToastItem = ToastConfig & { id: number };

type ToastItemProps = {
  item: ToastItem;
  onDismiss: (id: number) => void;
};

function ToastItem({ item, onDismiss }: ToastItemProps) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const typeStyles: Record<
    ToastType,
    {
      bg: string;
      border: string;
      icon: string;
      iconColor: string;
    }
  > = {
    success: {
      bg: theme.successBg,
      border: theme.success,
      icon: "✓",
      iconColor: theme.success,
    },
    warning: {
      bg: theme.warningBg,
      border: theme.warning,
      icon: "⚠",
      iconColor: theme.warning,
    },
    error: {
      bg: theme.errorBg,
      border: theme.error,
      icon: "✕",
      iconColor: theme.error,
    },
    info: {
      bg: theme.infoBg,
      border: theme.accentPrimary,
      icon: "i",
      iconColor: theme.accentPrimary,
    },
  };

  const t = typeStyles[item.type ?? "info"];

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (item.duration !== 0) {
      const timer = setTimeout(() => dismiss(), item.duration ?? 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(item.id));
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: t.bg,
          borderColor: t.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { borderColor: t.border }]}>
        <Text style={[styles.icon, { color: t.iconColor }]}>{t.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.message, { color: theme.textPrimary }]}>
          {item.message}
        </Text>
        {item.description ? (
          <Text style={[styles.description, { color: theme.textMuted }]}>
            {item.description}
          </Text>
        ) : null}
        {item.action ? (
          <TouchableOpacity
            onPress={() => {
              item.action!.onPress();
              dismiss();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionLabel, { color: t.iconColor }]}>
              {item.action.label}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Dismiss */}
      <TouchableOpacity
        onPress={dismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.dismissBtn}
      >
        <Text style={[styles.dismissText, { color: theme.textMuted }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Toast container ──────────────────────────────────────────────────

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const listener: ToastListener = (config) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { ...config, id }]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + spacing[3] }]}
      pointerEvents="box-none"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    zIndex: 9999,
    gap: spacing[2],
    pointerEvents: "box-none",
  },
  toast: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[3],
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  icon: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  message: {
    ...ui.body,
    fontWeight: "500",
    lineHeight: 20,
  },
  description: {
    ...ui.caption,
    lineHeight: 16,
  },
  actionLabel: {
    ...ui.caption,
    fontWeight: "600",
    marginTop: spacing[1],
  },
  dismissBtn: {
    padding: spacing[1],
    marginTop: -2,
  },
  dismissText: {
    fontSize: 12,
  },
});
