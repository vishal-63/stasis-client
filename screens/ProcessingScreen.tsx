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
import { subscribeToJob, getProcessingJob } from "../lib/db";
import { useTheme } from "../theme/ThemeContext";
import { display, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { Text } from "../theme/components";

type Props = {
  jobId: string;
  noteId: string;
  onComplete: (noteId: string) => void;
  onError: (message: string) => void;
  onCancel: () => void;
};

const RING_SIZE = 140;
const RING_RADIUS = 58;
const STROKE_WIDTH = 5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProcessingScreen({
  noteId,
  onComplete,
  onError,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const handleUpdateRef =
    useRef<
      (
        status: string,
        stage: string | null,
        progress: number,
        error?: string | null,
      ) => void
    >(null);

  handleUpdateRef.current = (status, _stage, updatedProgress, error) => {
    setProgress(updatedProgress);

    if (status === "done") {
      setCompleted(true);
      setProgress(100);
      setTimeout(() => onComplete(noteId), 900);
    } else if (status === "failed") {
      onError(error ?? "Processing failed. Please try again.");
    }
  };

  // Entrance
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

  // Spinner rotation
  useEffect(() => {
    if (completed) return;
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, [completed]);

  // Progress bar animation
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
    const isDone = { current: false };
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const handleJob = (
      status: string,
      stage: string | null,
      prog: number,
      error?: string | null,
    ) => {
      if (isDone.current) return;
      handleUpdateRef.current?.(status, stage, prog, error);
      if (status === "done" || status === "failed") {
        isDone.current = true;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    };

    getProcessingJob(noteId)
      .then((job) => {
        if (job) handleJob(job.status, job.stage, job.progress, job.error);
      })
      .catch(() => {});

    pollInterval = setInterval(async () => {
      if (isDone.current) {
        if (pollInterval) clearInterval(pollInterval);
        return;
      }
      try {
        const job = await getProcessingJob(noteId);
        if (job) handleJob(job.status, job.stage, job.progress, job.error);
      } catch {
        /* non-fatal */
      }
    }, 3000);

    const channel = subscribeToJob(noteId, (job) => {
      handleJob(job.status, job.stage, job.progress, job.error);
    });

    return () => {
      isDone.current = true;
      if (pollInterval) clearInterval(pollInterval);
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

  const pct = Math.round(progress);

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
        {/* Ring */}
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
            {/* Progress */}
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

          {/* Spinning arc */}
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
                  strokeDasharray={`${CIRCUMFERENCE * 0.12} ${CIRCUMFERENCE * 0.88}`}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              </Svg>
            </Animated.View>
          )}

          {/* Centre — numeric % */}
          <View style={styles.centre}>
            {completed ? (
              <Text style={[styles.checkmark, { color: theme.accentPrimary }]}>
                ✓
              </Text>
            ) : (
              <>
                <Text style={[styles.pctNumber, { color: theme.textPrimary }]}>
                  {pct}
                </Text>
                <Text style={[styles.pctSymbol, { color: theme.textMuted }]}>
                  %
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Title */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {completed ? "Note ready!" : "Processing"}
          </Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            {completed
              ? "Your note has been saved."
              : "This usually takes 30–60 seconds."}
          </Text>
        </View>

        {/* Hint */}
        <View
          style={[
            styles.hintBox,
            {
              backgroundColor: theme.raised,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.hintText, { color: theme.textMuted }]}>
            You can leave this screen — the note will appear in your list when
            ready.
          </Text>
        </View>

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
    paddingHorizontal: spacing[8],
    gap: spacing[8],
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
  centre: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  pctNumber: {
    ...display.noteTitle,
    fontSize: 36,
    lineHeight: 40,
  },
  pctSymbol: {
    ...ui.bodyMd,
    marginBottom: 4,
  },
  checkmark: {
    fontSize: 36,
    fontWeight: "700",
  },

  // Text
  textWrap: {
    alignItems: "center",
    gap: spacing[2],
  },
  title: {
    ...display.heading,
    textAlign: "center",
  },
  sub: {
    ...ui.secondary,
    textAlign: "center",
  },

  // Hint
  hintBox: {
    borderRadius: radius.md,
    borderWidth: 0.5,
    padding: spacing[4],
    width: "100%",
  },
  hintText: {
    ...ui.secondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // Cancel
  cancelBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
    borderWidth: 0.5,
  },
  cancelText: { ...ui.body },
});
