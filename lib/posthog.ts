import PostHog from "posthog-react-native";
import Constants from "expo-constants";

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as
  | string
  | undefined;
const host =
  (Constants.expoConfig?.extra?.posthogHost as string) ||
  "https://us.i.posthog.com";
const isConfigured =
  !!projectToken &&
  projectToken !== "phc_zdJaYqaLszJmdU3myYsVcwwQouU6Jxi2LFWEiZNuXMYm";

console.log(
  `PostHog configuration: projectToken=${projectToken}, host=${host}, isConfigured=${isConfigured}`,
);
export const posthog = new PostHog(
  projectToken || "phc_zdJaYqaLszJmdU3myYsVcwwQouU6Jxi2LFWEiZNuXMYm",
  {
    host,
    disabled: !isConfigured,
    captureAppLifecycleEvents: true,
    flushAt: 20,
    flushInterval: 10000,
    maxBatchSize: 100,
    maxQueueSize: 1000,
    preloadFeatureFlags: true,
    sendFeatureFlagEvent: true,
    featureFlagsRequestTimeoutMs: 10000,
    requestTimeout: 10000,
    fetchRetryCount: 3,
    fetchRetryDelay: 3000,
  },
);
