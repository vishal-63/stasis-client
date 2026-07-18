import { supabase } from "./supabase";

type ConfigKey =
  | "maintenance_mode"
  | "feedback_enabled"
  | "update_available"
  | "force_update"
  | "ads_enabled"
  | "rewarded_ads_enabled"
  | "native_ads_enabled"
  | "ad_free_window_minutes"
  | "ads_platform_ios"
  | "ads_platform_android";

type Config = Record<ConfigKey, string>;

const DEFAULTS: Config = {
  maintenance_mode: "false",
  feedback_enabled: "true",
  update_available: "false",
  force_update: "false",
  ads_enabled: "true",
  rewarded_ads_enabled: "true",
  native_ads_enabled: "true",
  ad_free_window_minutes: "30",
  ads_platform_ios: "true",
  ads_platform_android: "true",
};

export async function fetchRemoteConfig(): Promise<Config> {
  try {
    const { data, error } = await supabase.from("config").select("key, value");

    if (error || !data) {
      console.warn(
        "Remote config fetch failed, using defaults:",
        error?.message,
      );
      return DEFAULTS;
    }

    const config = { ...DEFAULTS };
    for (const row of data) {
      if (row.key in DEFAULTS) {
        config[row.key as ConfigKey] = row.value;
      }
    }

    return config;
  } catch (e) {
    console.warn("Remote config error, using defaults:", e);
    return DEFAULTS;
  }
}

// Typed helpers
export const remoteConfig = {
  bool: (config: Config, key: ConfigKey): boolean => config[key] === "true",

  number: (config: Config, key: ConfigKey): number => parseInt(config[key], 10),

  string: (config: Config, key: ConfigKey): string => config[key],

  json: <T>(config: Config, key: ConfigKey): T => JSON.parse(config[key]) as T,
};
