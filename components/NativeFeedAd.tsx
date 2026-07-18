import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from "react-native-google-mobile-ads";
import { display, fontSize, radius, spacing, ui, useTheme } from "../theme";
import { Text } from "../theme/components";
import { getAdUnitId } from "../lib/adConfig";

export const NativeComponent = () => {
  const [nativeAd, setNativeAd] = useState<NativeAd>();
  const { theme } = useTheme();

  useEffect(() => {
    NativeAd.createForAdRequest(getAdUnitId("native"))
      .then(setNativeAd)
      .catch(console.error);
  }, []);

  if (!nativeAd) {
    return null;
  }

  return (
    <View
      style={[
        styles.cardWrapper,
        {
          backgroundColor: theme.card,
          borderColor: theme.borderDefault,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <NativeAdView
        nativeAd={nativeAd}
        style={[
          styles.nativeAdView,
          {
            borderRadius: radius.lg,
          },
        ]}
      >
        <View
          style={[
            styles.cardInner,
            {
              backgroundColor: theme.card,
            },
          ]}
        >
          {/* Display the icon asset with Image component, and use NativeAsset toregister the view */}
          <NativeMediaView style={styles.thumbnail} />
          {/* Display the headline asset with Text component, and use NativeAsset to register the view */}
          <View style={styles.cardContent}>
            <Text
              style={[styles.cardContentNote, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              Sponsored
            </Text>

            <View style={styles.cardHeader}>
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text
                  style={[styles.cardTitle, { color: theme.textPrimary }]}
                  numberOfLines={2}
                >
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
            </View>
          </View>
        </View>
      </NativeAdView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    marginBottom: spacing[3],
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nativeAdView: {
    overflow: "hidden",
    borderRadius: radius.lg,
  },
  cardInner: {
    flexDirection: "row",
    minHeight: 120, // Bumped from 90 to 120 to satisfy AdMob video minimums
  },
  thumbnail: {
    width: 120, // Bumped from 90 to 120
    height: "100%",
    maxHeight: 120,
  },
  cardContent: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  cardTitle: {
    ...display.cardTitle,
    fontSize: fontSize.md,
    flex: 1,
  },
  moreBtn: {
    ...ui.body,
    letterSpacing: 1,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing[2],
  },
  statusText: {
    ...ui.tag,
    fontSize: 11,
  },
  cardContentNote: {
    ...ui.secondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing[2],
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[1],
  },
  folderPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  folderPillText: {
    ...ui.tag,
    fontSize: 11,
  },
  dateText: {
    ...ui.caption,
    marginLeft: "auto",
  },
});
