import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchRemoteConfig, remoteConfig } from "../lib/remoteConfig";
import { Platform } from "react-native";

type RemoteConfigContextType = {
  config: Record<string, string>;
  loading: boolean;
  refresh: () => Promise<void>;
  // Typed accessors
  maintenanceMode: boolean;
  feedbackEnabled: boolean;
  update_available: boolean;
  force_update: boolean;
  adsEnabled: boolean;
  rewardedAdsEnabled: boolean;
  nativeAdsEnabled: boolean;
  adFreeWindowMs: number;
};

const RemoteConfigContext = createContext<RemoteConfigContextType>({
  config: {},
  loading: true,
  refresh: async () => {},
  maintenanceMode: false,
  feedbackEnabled: true,
  update_available: false,
  force_update: false,
  adsEnabled: false,
  rewardedAdsEnabled: false,
  nativeAdsEnabled: false,
  adFreeWindowMs: 30,
});

export function RemoteConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const c = await fetchRemoteConfig();
    setConfig(c);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const isDone = (c: any) => {
    const masterOn = remoteConfig.bool(c, "ads_enabled");
    const platformOn =
      Platform.OS === "ios"
        ? remoteConfig.bool(c, "ads_platform_ios")
        : remoteConfig.bool(c, "ads_platform_android");
    const windowMins = remoteConfig.number(c, "ad_free_window_minutes");

    return {
      adsEnabled: masterOn && platformOn,
      rewardedAdsEnabled:
        masterOn && platformOn && remoteConfig.bool(c, "rewarded_ads_enabled"),
      nativeAdsEnabled:
        masterOn && platformOn && remoteConfig.bool(c, "native_ads_enabled"),
      adFreeWindowMs: windowMins * 60 * 1000,
    };
  };

  return (
    <RemoteConfigContext.Provider
      value={{
        config,
        loading,
        refresh: load,
        maintenanceMode: remoteConfig.bool(config as any, "maintenance_mode"),
        feedbackEnabled: remoteConfig.bool(config as any, "feedback_enabled"),
        update_available: remoteConfig.bool(config as any, "update_available"),
        force_update: remoteConfig.bool(config as any, "force_update"),
        ...isDone(config as any),
      }}
    >
      {children}
    </RemoteConfigContext.Provider>
  );
}

export const useRemoteConfig = () => useContext(RemoteConfigContext);
