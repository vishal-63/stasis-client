import "base-64";
import "react-native-gesture-handler";
import "fast-text-encoding";
import "react-native-get-random-values";
import { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ShareIntent, useShareIntent } from "expo-share-intent";
import { Alert, View } from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";

import RootNavigator, { RootStackParamList } from "./navigation/RootNavigator";
import ProcessingScreen from "./screens/ProcessingScreen";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { extractKnowledgeFromUrl } from "./lib/processReel";
import { pendingShare } from "./lib/pendingShare";

import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ThemeProvider } from "./theme";
import { useNetwork } from "./hooks/useNetwork";
import { toast, ToastContainer } from "./components/Toast";
import {
  RemoteConfigProvider,
  useRemoteConfig,
} from "./context/RemoteConfigContext";
import MaintenanceScreen from "./screens/MaintenanceScreen";
import {
  checkAdFreeWindow,
  preloadAd,
  unlockNoteInAdFreeWindow,
} from "./lib/adManager";
import { submitMockReelForProcessing } from "./lib/mockApi";

const SUPPORTED_URL_REGEX =
  /https:\/\/(?:(?:www\.|m\.)?instagram\.com\/reel\/[\w-]+\/?|(?:www\.|m\.)?youtube\.com\/shorts\/[\w-]+|youtu\.be\/[\w-]+)/;

type ProcessingState = {
  noteId: string;
  adFreeWindow: boolean;
  showAd: boolean;
} | null;

function AppContent() {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const { isOffline } = useNetwork();
  const [processing, setProcessing] = useState<ProcessingState>(null);
  const [processingPending, setProcessingPending] = useState<boolean>(false);

  const { maintenanceMode, rewardedAdsEnabled, adFreeWindowMs } =
    useRemoteConfig();

  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntent();

  const processUrl = async (url: string) => {
    if (!user) return;
    if (isOffline) {
      toast.error("Offline", {
        description: "Please connect to the internet to create a new note",
      });
      return;
    }

    const inAdFreeWindow = rewardedAdsEnabled
      ? await checkAdFreeWindow(user.id, adFreeWindowMs)
      : true;

    try {
      let result;
      if (__DEV__) {
        result = await submitMockReelForProcessing(user.id, url);
      } else {
        result = await extractKnowledgeFromUrl(user.id, url);
      }

      if (inAdFreeWindow) {
        await unlockNoteInAdFreeWindow(result.noteId);
      }
      setProcessing({
        noteId: result.noteId,
        adFreeWindow: rewardedAdsEnabled && inAdFreeWindow,
        showAd: rewardedAdsEnabled,
      });
    } catch (e: any) {
      toast.error("Error in api request", {
        description: "Failed to start processing. Please try again.",
      });
    }
  };

  const handleShare = async (shareIntent: ShareIntent) => {
    if (maintenanceMode) return;

    if (hasShareIntent && shareIntent.webUrl) {
      // Strip query params and fragments from the URL
      const text = (shareIntent.webUrl || shareIntent.text || "")
        .split("?")[0]
        .split("#")[0];

      const match = text.match(SUPPORTED_URL_REGEX);
      if (!match) {
        Alert.alert(
          "Invalid URL",
          "Please share a valid Instagram Reel or YouTube Shorts URL.",
        );
        return;
      }

      const url = match[0];

      if (!user) {
        pendingShare.set(url);
        Alert.alert(
          "Sign in required",
          "Please sign in to save this Video. We will start processing as soon as you're signed in.",
        );
        return;
      }

      await processUrl(url);
    }
  };

  useEffect(() => {
    if (error) {
      Alert.alert("Share Error", error);
    }
    if (hasShareIntent && shareIntent) {
      handleShare(shareIntent);
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, error]);

  useEffect(() => {
    if (authLoading) return;
    const pending = pendingShare.get();
    if (!pending || !user || processingPending) return;

    // User just signed in and there's a pending URL
    setProcessingPending(true);
    pendingShare.clear();

    Alert.alert(
      "Processing your Video",
      "You're signed in! We're now processing the Video you shared.",
      [{ text: "OK" }],
    );

    processUrl(pending).finally(() => setProcessingPending(false));
  }, [user, authLoading]);

  const handleProcessingComplete = (noteId: string) => {
    setProcessing(null);
    navigationRef.current?.navigate("NoteDetail", { noteId });

    if (rewardedAdsEnabled) preloadAd();
  };

  const handleProcessingError = (message: string) => {
    setProcessing(null);
    Alert.alert("Processing failed", message);
  };

  const handleCancel = () => {
    setProcessing(null);
  };

  // Ping backend every 10 minutes to prevent cold starts
  useEffect(() => {
    if (rewardedAdsEnabled) preloadAd();

    const keepAlive = async () => {
      try {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/health`);
      } catch {}
    };

    keepAlive(); // ping on app open
    const interval = setInterval(keepAlive, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(interval);
  }, []);

  // Maintenance mode gate in App.tsx
  if (maintenanceMode) {
    return <MaintenanceScreen />;
  }

  if (processing) {
    return (
      <ProcessingScreen
        noteId={processing.noteId}
        userId={user!.id}
        rewardedAdsEnabled={rewardedAdsEnabled}
        adFreeWindow={processing.adFreeWindow}
        onComplete={handleProcessingComplete}
        onError={handleProcessingError}
        onCancel={handleCancel}
      />
    );
  }

  return <RootNavigator navigationRef={navigationRef} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#F8FAFC" }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RemoteConfigProvider>
            <AppContent />
            <ToastContainer />
          </RemoteConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
