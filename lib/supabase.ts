import "fast-text-encoding";
import "react-native-get-random-values";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as ExpoCrypto from "expo-crypto";

// ─── SecureStore adapter ─────────────────────────────────────────────
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ─── WebCrypto polyfill ──────────────────────────────────────────────
// Must be applied before createClient is called
const applyWebCryptoPolyfill = () => {
  const g = globalThis as any;

  // Already available — nothing to do
  if (g.crypto?.subtle?.digest) return;

  g.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const bytes = ExpoCrypto.getRandomBytes(array.length);
      array.set(bytes);
      return array;
    },
    subtle: {
      digest: async (
        algorithm: AlgorithmIdentifier,
        data: ArrayBuffer,
      ): Promise<ArrayBuffer> => {
        const algoName =
          typeof algorithm === "string" ? algorithm : algorithm.name;

        const hashAlgo =
          algoName === "SHA-256"
            ? ExpoCrypto.CryptoDigestAlgorithm.SHA256
            : ExpoCrypto.CryptoDigestAlgorithm.SHA1;

        // Convert ArrayBuffer → Uint8Array → base64 string for expo-crypto
        const uint8 = new Uint8Array(data);
        const binary = uint8.reduce(
          (acc, byte) => acc + String.fromCharCode(byte),
          "",
        );

        // Get base64-encoded digest
        const base64 = await ExpoCrypto.digestStringAsync(hashAlgo, binary, {
          encoding: ExpoCrypto.CryptoEncoding.BASE64,
        });

        // Convert base64 → ArrayBuffer (what SubtleCrypto.digest must return)
        const binaryStr = atob(base64);
        const buffer = new ArrayBuffer(binaryStr.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryStr.length; i++) {
          view[i] = binaryStr.charCodeAt(i);
        }
        return buffer;
      },
    },
  };
};

applyWebCryptoPolyfill();

// ─── Supabase client ─────────────────────────────────────────────────
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  },
);
