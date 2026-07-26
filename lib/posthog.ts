import PostHog from "posthog-react-native";

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
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
