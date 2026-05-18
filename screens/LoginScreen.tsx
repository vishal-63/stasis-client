import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Text, Button, TextInput } from "../theme/components";
import { display, lineHeight, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { useTheme } from "../theme";

type Step = "enter_email" | "enter_code" | "error";

export default function LoginScreen() {
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>("enter_email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const transitionTo = (next: Step) => setStep(next);

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address.");
      transitionTo("error");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      transitionTo("enter_code");
      startCooldown();
    } catch (e: any) {
      console.error("Error sending OTP:", e);
      const msg = e.message?.includes("rate limit")
        ? "Too many attempts. Please wait a minute and try again."
        : (e.message ?? "Something went wrong. Please try again.");
      setErrorMsg(msg);
      transitionTo("error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "email",
      });
      if (error) throw error;
    } catch (e: any) {
      const msg = e.message?.includes("expired")
        ? "This code has expired. Please request a new one."
        : e.message?.includes("invalid")
          ? "Incorrect code. Please check and try again."
          : "Something went wrong. Please try again.";
      setErrorMsg(msg);
      transitionTo("error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEmail("");
    setCode("");
    setErrorMsg("");
    transitionTo("enter_email");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.base }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View
              style={[
                styles.logo,
                {
                  backgroundColor: theme.textPrimary,
                  borderColor: theme.textSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.logoLetter,
                  {
                    color: theme.textInverse,
                  },
                ]}
              >
                S
              </Text>
            </View>
            <Text
              style={[
                styles.appName,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Stasis
            </Text>
            <Text variant="muted" style={styles.tagline}>
              Save insights from any Instagram Reel
            </Text>
          </View>

          {/* Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.raised,
                borderColor: theme.borderDefault,
              },
            ]}
          >
            {/* Step — enter email */}
            {step === "enter_email" && (
              <View>
                <Text variant="heading" style={styles.cardTitle}>
                  Sign in
                </Text>
                <Text variant="secondary" style={styles.cardSub}>
                  Enter your email and we'll send you a sign-in code.
                </Text>

                <TextInput
                  label="Email Address"
                  value={email}
                  onChangeText={(text) => setEmail(text.trim())}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={sendOtp}
                  editable={!loading}
                  inputStyle={styles.input}
                />

                <Button
                  label={loading ? "Sending…" : "Send sign-in code →"}
                  onPress={sendOtp}
                  disabled={!email || loading}
                  loading={loading}
                  style={styles.btnSpacing}
                />
              </View>
            )}

            {/* Step — enter code */}
            {step === "enter_code" && (
              <View style={styles.centred}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: theme.overlay,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.iconEmoji,
                      {
                        color: theme.textSecondary,
                      },
                    ]}
                  >
                    ✉
                  </Text>
                </View>

                <Text variant="heading" style={styles.cardTitle}>
                  Check your inbox
                </Text>
                <Text variant="secondary" style={styles.cardSub}>
                  We've sent a 6-digit code to
                </Text>
                <Text
                  style={[
                    styles.emailHighlight,
                    {
                      color: theme.accentHighlight,
                    },
                  ]}
                >
                  {email}
                </Text>

                <TextInput
                  value={code}
                  onChangeText={(t) =>
                    setCode(t.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={verifyOtp}
                  style={[styles.input, styles.codeInput]}
                />

                <Button
                  label={loading ? "Verifying…" : "Verify code →"}
                  onPress={verifyOtp}
                  disabled={code.length !== 6 || loading}
                  loading={loading}
                  fullWidth
                  style={styles.btnSpacing}
                />

                <View
                  style={[
                    styles.dividerLine,
                    {
                      marginVertical: spacing[4],
                      backgroundColor: theme.borderSubtle,
                    },
                  ]}
                />

                <Button
                  label={
                    cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"
                  }
                  variant="ghost"
                  onPress={sendOtp}
                  disabled={cooldown > 0 || loading}
                  fullWidth
                />

                <TouchableOpacity onPress={reset} style={styles.linkBtn}>
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: theme.accentHighlight,
                      },
                    ]}
                  >
                    Use a different email
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step — error */}
            {step === "error" && (
              <View style={styles.centred}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: theme.errorBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.iconError,
                      {
                        color: theme.error,
                      },
                    ]}
                  >
                    !
                  </Text>
                </View>

                <Text variant="heading" style={styles.cardTitle}>
                  Something went wrong
                </Text>
                <Text
                  style={[
                    styles.errorMsg,
                    {
                      color: theme.error,
                    },
                  ]}
                >
                  {errorMsg}
                </Text>

                <Button label="Try again" onPress={reset} fullWidth />
              </View>
            )}
          </View>

          {/* Footer */}
          <Text variant="muted" style={styles.footer}>
            By signing in you agree to our Terms & Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
    gap: spacing[6],
  },

  // Brand
  brand: {
    alignItems: "center",
    gap: spacing[2],
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[2],
    borderWidth: 0.5,
  },
  logoLetter: {
    ...display.brandName,
    fontSize: 32,
    lineHeight: 32,
  },
  appName: {
    ...display.brandName,
    fontSize: 28,
    lineHeight: lineHeight.loose,
  },
  tagline: {
    textAlign: "center",
  },

  // Card
  card: {
    borderRadius: radius.xl,
    borderWidth: 0.5,
    padding: spacing[6],
  },
  cardTitle: {
    textAlign: "center",
    marginBottom: spacing[2],
  },
  cardSub: {
    textAlign: "center",
    marginBottom: spacing[5],
  },
  centred: {
    alignItems: "center",
  },

  // Input
  input: {
    marginBottom: spacing[3],
    lineHeight: lineHeight.tight,
  },
  codeInput: {
    ...ui.codeInput,
    width: 200,
    marginVertical: spacing[5],
  },

  // Buttons
  btnSpacing: {
    marginTop: spacing[2],
  },
  socialBtn: {
    marginTop: spacing[3],
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginVertical: spacing[5],
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
  },
  dividerText: {
    textAlign: "center",
  },

  // Code step
  emailHighlight: {
    ...display.subheading,
    marginVertical: spacing[2],
    textAlign: "center",
  },

  // Icons
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  iconEmoji: {
    fontSize: 26,
  },
  iconError: {
    fontSize: 26,
    fontWeight: "700",
  },

  // Error
  errorMsg: {
    ...ui.body,
    textAlign: "center",
    marginBottom: spacing[6],
    lineHeight: 22,
  },

  // Links
  linkBtn: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
  },
  linkText: {
    ...ui.body,
    textAlign: "center",
  },

  // Footer
  footer: {
    textAlign: "center",
    lineHeight: 18,
  },
});
