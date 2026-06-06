import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "@stasis_cache_";

export const Cache = {
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, jsonValue);
    } catch (e) {
      console.warn("Failed to save to cache", e);
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.warn("Failed to read from cache", e);
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (e) {
      console.warn("Failed to clear cache", e);
    }
  },
};
