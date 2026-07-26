import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useRemoteConfig } from "../context/RemoteConfigContext";
import { Text } from "../theme/components";
import { display, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";

export default function UpdatePopup() {
  const { theme } = useTheme();
  const { updateAvailable, forceUpdate: forceUpdateEnabled } =
    useRemoteConfig();
  const [isVisible, setIsVisible] = useState(false);

  // Trigger the popup when config is loaded and update_available is true
  useEffect(() => {
    if (updateAvailable) {
      setIsVisible(true);
    }
  }, [updateAvailable]);

  if (!isVisible) return null;

  // Fallback URLs if you don't provide them via your remote config
  // const defaultIosUrl = "https://apps.apple.com/app/idYOUR_APP_ID";
  // const defaultAndroidUrl = "market://details?id=com.yourname.stasis";
  // const storeUrl =
  //   config.store_url ||
  //   (Platform.OS === "ios" ? defaultIosUrl : defaultAndroidUrl);

  const handleUpdate = () => {
    // Linking.canOpenURL(storeUrl).then((supported) => {
    //   if (supported) {
    //     Linking.openURL(storeUrl);
    //   } else {
    //     console.warn("Cannot open store URL:", storeUrl);
    //   }
    // });
  };

  const handleDismiss = () => {
    if (!forceUpdateEnabled) {
      setIsVisible(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isVisible}
      // onRequestClose fires when the Android hardware back button is pressed
      onRequestClose={handleDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.6)" }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.appBg,
              borderColor: theme.borderDefault,
            },
          ]}
        >
          {/* Icon Header */}
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: theme.raised,
                borderColor: theme.borderDefault,
              },
            ]}
          >
            <Text style={styles.icon}>✨</Text>
          </View>

          {/* Text Content */}
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Update Available
            </Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              {forceUpdateEnabled
                ? "A new version of Stasis is available with new features and improvements. Please update to the latest version."
                : "A new version of Stasis is available with new features and improvements. Would you like to update now?"}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.accentPrimary },
              ]}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.primaryBtnText, { color: theme.textInverse }]}
              >
                Update Now
              </Text>
            </TouchableOpacity>

            {/* Only show the dismiss button if it's NOT a forced update */}
            {!forceUpdateEnabled && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleDismiss}
                activeOpacity={0.6}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: theme.textMuted }]}
                >
                  Maybe Later
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  card: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 0.5,
    padding: spacing[6],
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  icon: {
    fontSize: 28,
    lineHeight: 34,
  },
  textWrap: {
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  title: {
    ...display.cardTitle,
    textAlign: "center",
  },
  sub: {
    ...ui.body,
    textAlign: "center",
    lineHeight: 22,
  },
  actionWrap: {
    width: "100%",
    gap: spacing[3],
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: spacing[3] + 2,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primaryBtnText: {
    ...ui.body,
    fontWeight: "600",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  secondaryBtnText: {
    ...ui.body,
    fontWeight: "500",
  },
});
