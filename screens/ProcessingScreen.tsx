import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { getJobStatus } from "../lib/api";
import { subscribeToJob } from "../lib/db";
import { useTheme } from "../theme/ThemeContext";
import { display, fontSize, lineHeight, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { Text } from "../theme/components";

type Props = {
  jobId: string;
  noteId: string;
  onComplete: (noteId: string) => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

const STAGE_LABELS: Record<string, string> = {
  queued: "Waiting in queue…",
  downloading: "Downloading reel…",
  transcribing: "Transcribing audio…",
  summarising: "Generating notes…",
  done: "Done!",
  failed: "Failed",
};

const STEPS = [
  { label: "Download", doneAt: 30, activeAt: 5 },
  { label: "Transcribe", doneAt: 70, activeAt: 31 },
  { label: "Generate notes", doneAt: 95, activeAt: 71 },
];

const RING_SIZE = 120;
const RING_RADIUS = 52;
const STROKE_WIDTH = 4;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Animated SVG circle using JS driver
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProcessingScreen({
  noteId,
  onComplete,
  onError,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const [stage, setStage] = useState("Waiting in queue…");
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Animations
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const stepAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

  const handleUpdateRef =
    useRef<
      (
        status: string,
        stage: string | null,
        progress: number,
        error?: string | null,
      ) => void
    >(null);

  handleUpdateRef.current = (status, updatedStage, updatedProgress, error) => {
    setStage(updatedStage ?? STAGE_LABELS[status] ?? "Processing…");
    setProgress(updatedProgress);

    // Animate step indicators
    STEPS.forEach((step, i) => {
      if (updatedProgress >= step.activeAt) {
        Animated.spring(stepAnims[i], {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }).start();
      }
    });

    if (status === "done") {
      setCompleted(true);
      setProgress(100);
      setTimeout(() => onComplete(noteId), 900);
    } else if (status === "failed") {
      onError(error ?? "Processing failed. Please try again.");
    }
  };

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }),
    ]).start();
  }, []);

  // Rotating arc — spins continuously
  useEffect(() => {
    if (completed) return;
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, [completed]);

  // Progress ring
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [progress]);

  // Polling + Realtime
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const job = await getJobStatus(noteId);
        handleUpdateRef.current?.(
          job.status,
          job.stage,
          job.progress,
          job.error,
        );
        if (job.status === "done" || job.status === "failed")
          clearInterval(poll);
      } catch {
        /* non-fatal */
      }
    }, 4000);

    const channel = subscribeToJob(noteId, (job) => {
      handleUpdateRef.current?.(job.status, job.stage, job.progress, job.error);
    });

    getJobStatus(noteId)
      .then((job) =>
        handleUpdateRef.current?.(
          job.status,
          job.stage,
          job.progress,
          job.error,
        ),
      )
      .catch(() => {});

    return () => {
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [noteId]);

  const spinDegree = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.appBg }]}
      edges={["top", "bottom"]}
    >
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Ring + logo */}
        <View style={styles.ringWrap}>
          <Svg
            width={RING_SIZE}
            height={RING_SIZE}
            style={StyleSheet.absoluteFill}
          >
            {/* Track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={theme.overlay}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Progress fill */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={theme.accentPrimary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>

          {/* Spinning arc overlay — native driven */}
          {!completed && (
            <Animated.View
              style={[
                styles.spinnerWrap,
                { transform: [{ rotate: spinDegree }] },
              ]}
            >
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={theme.accentSecondary}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={`${CIRCUMFERENCE * 0.18} ${CIRCUMFERENCE * 0.82}`}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              </Svg>
            </Animated.View>
          )}

          {/* Logo */}
          <View
            style={[
              styles.logo,
              {
                backgroundColor: theme.raised,
                borderColor: theme.borderDefault,
              },
            ]}
          >
            {completed ? (
              <Text style={[styles.checkmark, { color: theme.accentPrimary }]}>
                ✓
              </Text>
            ) : (
              <Text style={[styles.logoLetter, { color: theme.accentPrimary }]}>
                S
              </Text>
            )}
          </View>
        </View>

        {/* Title + stage */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {completed ? "Note ready!" : "Processing your reel"}
          </Text>
          <Text style={[styles.stage, { color: theme.textMuted }]}>
            {stage}
          </Text>
          <Text style={[styles.pct, { color: theme.accentPrimary }]}>
            {Math.round(progress)}%
          </Text>
        </View>

        {/* Step indicators */}
        <View
          style={[
            styles.stepsCard,
            {
              backgroundColor: theme.raised,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          {STEPS.map((step, i) => {
            const isDone = progress >= step.doneAt;
            const isActive = progress >= step.activeAt && !isDone;
            return (
              <Animated.View
                key={step.label}
                style={[
                  styles.stepRow,
                  i < STEPS.length - 1 && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: theme.borderSubtle,
                  },
                  {
                    opacity: stepAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                    transform: [
                      {
                        translateX: stepAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Icon */}
                <View
                  style={[
                    styles.stepIcon,
                    {
                      backgroundColor: isDone
                        ? theme.accentPrimary
                        : isActive
                          ? theme.accentSubtle
                          : theme.overlay,
                      borderColor: isDone
                        ? theme.accentPrimary
                        : isActive
                          ? theme.accentPrimary
                          : theme.borderDefault,
                    },
                  ]}
                >
                  {isDone ? (
                    <Text
                      style={[styles.stepCheck, { color: theme.textInverse }]}
                    >
                      ✓
                    </Text>
                  ) : isActive ? (
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: theme.accentPrimary },
                      ]}
                    />
                  ) : (
                    <Text style={[styles.stepNum, { color: theme.textMuted }]}>
                      {i + 1}
                    </Text>
                  )}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isDone
                        ? theme.textPrimary
                        : isActive
                          ? theme.accentHighlight
                          : theme.textMuted,
                      fontWeight: isDone || isActive ? "500" : "400",
                    },
                  ]}
                >
                  {step.label}
                </Text>

                {/* Right status */}
                {isDone && (
                  <Text
                    style={[styles.stepStatus, { color: theme.accentPrimary }]}
                  >
                    Done
                  </Text>
                )}
                {isActive && (
                  <Text
                    style={[
                      styles.stepStatus,
                      { color: theme.accentHighlight },
                    ]}
                  >
                    In progress
                  </Text>
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* Hint */}
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Usually 30-60 seconds. You can leave this screen.
        </Text>

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: theme.borderStrong }]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelText, { color: theme.textMuted }]}>
            Go to notes
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    gap: spacing[6],
  },

  // Ring
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerWrap: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    ...display.brandName,
    fontSize: fontSize.xxxl,
    lineHeight: lineHeight.loose,
  },
  checkmark: {
    fontSize: fontSize.xxxl,
    lineHeight: lineHeight.loose,
    fontWeight: "700",
  },

  // Text
  textWrap: {
    alignItems: "center",
    gap: spacing[1],
  },
  title: {
    ...display.heading,
    textAlign: "center",
  },
  stage: {
    ...ui.body,
    textAlign: "center",
  },
  pct: {
    ...ui.label,
    fontSize: 13,
    marginTop: spacing[1],
  },

  // Steps card
  stepsCard: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCheck: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepNum: {
    ...ui.caption,
    fontWeight: "600",
  },
  stepLabel: {
    ...ui.body,
    flex: 1,
  },
  stepStatus: {
    ...ui.caption,
  },

  // Bottom
  hint: {
    ...ui.caption,
    textAlign: "center",
    lineHeight: 18,
  },
  cancelBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
    borderWidth: 0.5,
  },
  cancelText: {
    ...ui.body,
  },
});
