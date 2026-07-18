import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { useTheme } from "../theme/ThemeContext";
import { useRemoteConfig } from "../context/RemoteConfigContext";
import { Text } from "../theme/components";
import { display, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";

export default function MaintenanceScreen() {
  const { theme } = useTheme();
  const { refresh, config, maintenanceMode } = useRemoteConfig();
  const [isChecking, setIsChecking] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
    ]).start();
  }, []);

  // Pulse animation for the icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Listen for config changes to trigger the reload
  useEffect(() => {
    if (!config) return;

    const isMaintenanceOn = maintenanceMode;

    // If the check confirms maintenance is off, force an app restart
    if (!isMaintenanceOn) {
      Updates.reloadAsync().catch(() => {
        // Fallback for development environments where Updates API might not be available
        console.log("App reload triggered (Updates API not available in dev)");
      });
    }
  }, [config]);

  const handleCheckAgain = async () => {
    setIsChecking(true);
    try {
      // Trigger context to fetch the latest config from Supabase
      await refresh();
      // If maintenance mode is off, the useEffect above will catch it and reload the app.
    } catch (error) {
      console.error("Failed to check maintenance status:", error);
    } finally {
      // Only runs if the app doesn't reload (i.e., still in maintenance or error)
      setIsChecking(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.appBg }]}
      edges={["top", "bottom"]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Icon */}
        <Animated.View
          style={[
            styles.iconWrap,
            {
              backgroundColor: theme.raised,
              borderColor: theme.borderDefault,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.icon}>🔧</Text>
        </Animated.View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Under Maintenance
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            We're making Stasis better.{"\n"}
            This won't take long.
          </Text>
        </View>

        {/* Status card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.raised,
              borderColor: theme.borderDefault,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: theme.warning }]}
            />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              Maintenance in progress
            </Text>
          </View>
          <View
            style={[
              styles.statusDivider,
              { backgroundColor: theme.borderSubtle },
            ]}
          />
          <Text style={[styles.statusHint, { color: theme.textMuted }]}>
            Your notes and data are safe. We'll be back shortly.
          </Text>
        </View>

        {/* Check again button */}
        <TouchableOpacity
          style={[
            styles.refreshBtn,
            {
              backgroundColor: theme.accentPrimary,
            },
          ]}
          onPress={handleCheckAgain}
          activeOpacity={0.8}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color={theme.textInverse} />
          ) : (
            <Text style={[styles.refreshBtnText, { color: theme.textInverse }]}>
              Check again
            </Text>
          )}
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.brandLogo, { backgroundColor: theme.overlay }]}>
            <Text
              style={[styles.brandLogoText, { color: theme.accentPrimary }]}
            >
              S
            </Text>
          </View>
          <Text style={[styles.brandName, { color: theme.textMuted }]}>
            Stasis
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    gap: spacing[6],
  },

  // Icon
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  icon: {
    fontSize: 40,
    lineHeight: 48,
  },

  // Text
  textWrap: {
    alignItems: "center",
    gap: spacing[2],
  },
  title: {
    ...display.heading,
    textAlign: "center",
  },
  sub: {
    ...ui.bodyMd,
    textAlign: "center",
    lineHeight: 24,
  },

  // Status card
  statusCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing[4],
    gap: spacing[3],
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...ui.body,
    fontWeight: "500",
  },
  statusDivider: {
    height: 0.5,
  },
  statusHint: {
    ...ui.secondary,
    lineHeight: 20,
  },

  // Refresh button
  refreshBtn: {
    width: "100%",
    height: 56,
    justifyContent: "center",
    borderRadius: radius.md,
    alignItems: "center",
  },
  refreshBtnText: {
    ...ui.body,
    fontWeight: "600",
  },

  // Brand
  brand: {
    position: "absolute",
    bottom: spacing[6],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  brandLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  brandLogoText: {
    fontSize: 13,
    fontWeight: "700",
  },
  brandName: {
    ...ui.caption,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
