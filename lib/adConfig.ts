import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

export const AD_UNIT_IDS = {
  rewarded: Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ADUNIT_ID_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ADUNIT_ID_ANDROID,
  })!,
  native: Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ADUNIT_ID_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ADUNIT_ID_ANDROID,
  })!,
};

// Test IDs for development — replace with real IDs for production
export const TEST_AD_UNIT_IDS = {
  rewarded: Platform.select({
    ios: TestIds.REWARDED,
    android: TestIds.REWARDED,
  })!,
  native: Platform.select({
    ios: TestIds.NATIVE,
    android: TestIds.NATIVE,
  })!,
};

export const getAdUnitId = (unit: keyof typeof AD_UNIT_IDS) => {
  if (__DEV__) {
    return TEST_AD_UNIT_IDS[unit];
  }

  const prodId = AD_UNIT_IDS[unit];
  if (!prodId) {
    console.warn(`Missing production ad unit ID for ${unit}`);
    return "";
  }

  return prodId;
};
