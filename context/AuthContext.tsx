import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<void>; // replaces signInWithMagicLink
  // signInWithGoogle: () => Promise<void>;
  // signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Bootstrap ───────────────────────────────────────────────────
  useEffect(() => {
    // Restore persisted session on launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // React to sign in / sign out / token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ─── Sign in with OTP ──────────────────────────────────────────────
  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  };

  // // ─── Google OAuth ────────────────────────────────────────────────
  // const signInWithGoogle = async () => {
  //   const { data, error } = await supabase.auth.signInWithOAuth({
  //     provider: "google",
  //     options: {
  //       redirectTo: "stasis://auth/callback",
  //       skipBrowserRedirect: true,
  //     },
  //   });
  //   if (error) throw error;
  //   if (!data.url) throw new Error("No OAuth URL returned");

  //   const result = await WebBrowser.openAuthSessionAsync(
  //     data.url,
  //     "stasis://auth/callback",
  //   );

  //   if (result.type === "success") {
  //     await handleAuthDeepLink(result.url);
  //   }
  // };

  // // ─── Apple Sign In ───────────────────────────────────────────────
  // const signInWithApple = async () => {
  //   if (Platform.OS !== "ios") return;

  //   const credential = await AppleAuthentication.signInAsync({
  //     requestedScopes: [
  //       AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
  //       AppleAuthentication.AppleAuthenticationScope.EMAIL,
  //     ],
  //   });

  //   if (!credential.identityToken) {
  //     throw new Error("No identity token returned from Apple");
  //   }

  //   const { error } = await supabase.auth.signInWithIdToken({
  //     provider: "apple",
  //     token: credential.identityToken,
  //   });
  //   if (error) throw error;
  // };

  // ─── Sign out ────────────────────────────────────────────────────
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithOtp,
        // signInWithGoogle,
        // signInWithApple,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
