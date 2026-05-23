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
import { processReelUrl } from "./lib/processReel";
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

const INSTAGRAM_REEL_REGEX =
  /https:\/\/(?:www\.)?instagram\.com\/reel\/[\w-]+\/?/;

type ProcessingState = {
  noteId: string;
  jobId: string;
} | null;

function AppContent() {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState<ProcessingState>(null);
  const [processingPending, setProcessingPending] = useState<boolean>(false);

  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntent();

  const processUrl = async (url: string) => {
    if (!user) return;
    try {
      const result = await processReelUrl(user.id, url);
      setProcessing(result);
    } catch (e: any) {
      Alert.alert(
        "Error in api request",
        e.message ?? "Failed to start processing. Please try again.",
      );
    }
  };

  const handleShare = async (shareIntent: ShareIntent) => {
    if (hasShareIntent && shareIntent.webUrl) {
      const text = shareIntent.webUrl || shareIntent.text || "";

      const match = text.match(INSTAGRAM_REEL_REGEX);
      if (!match) {
        Alert.alert(
          "Not a Reel",
          "Please share an Instagram Reel URL to create a note.",
        );
        return;
      }
      const reelUrl = match[0];

      if (!user) {
        pendingShare.set(reelUrl);
        Alert.alert(
          "Sign in required",
          "Please sign in to save this Reel as a note. Your Reel will be processed automatically after signing in.",
          [{ text: "OK" }],
        );
        return;
      }

      await processUrl(reelUrl);
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
      "Processing your Reel",
      "You're signed in! We're now processing the Reel you shared.",
      [{ text: "OK" }],
    );

    processUrl(pending).finally(() => setProcessingPending(false));
  }, [user, authLoading]);

  const handleProcessingComplete = (noteId: string) => {
    setProcessing(null);
    // NavigationContainer handles the rest — we push NoteDetail
    // Use a ref to the navigation to push from outside the navigator
    navigationRef.current?.navigate("NoteDetail", { noteId });
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
    const keepAlive = async () => {
      try {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/health`);
      } catch {}
    };

    keepAlive(); // ping on app open
    const interval = setInterval(keepAlive, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(interval);
  }, []);

  if (processing) {
    return (
      <ProcessingScreen
        jobId={processing.jobId}
        noteId={processing.noteId}
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
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
