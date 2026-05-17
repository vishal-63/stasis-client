import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Markdown from "react-native-markdown-display";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getNoteById, subscribeToJob } from "../lib/db";
import { getJobStatus } from "../lib/api";
import { NoteWithTags, ProcessingJob, NoteStatus } from "../types/database";
import { useAuth } from "../context/AuthContext";
import FolderPickerModal from "./FolderPickerModal";
import { Text } from "../theme/components";
import { display, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { useTheme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "NoteDetail">;

const STAGE_LABELS: Record<string, string> = {
  queued: "Waiting in queue…",
  downloading: "Downloading reel…",
  transcribing: "Transcribing audio…",
  summarising: "Generating notes…",
};

const STEPS = [
  { label: "Download", doneAt: 30, activeAt: 5 },
  { label: "Transcribe", doneAt: 70, activeAt: 31 },
  { label: "Generate notes", doneAt: 95, activeAt: 71 },
];

const statusColor = (status: NoteStatus, theme: any) =>
  ({
    queued: theme.textMuted,
    downloading: theme.accentHighlight,
    transcribing: theme.accentHighlight,
    summarising: theme.accentHighlight,
    done: theme.success,
    failed: theme.error,
  })[status] ?? theme.textMuted;

export default function NoteDetailScreen({ route, navigation }: Props) {
  const { noteId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [note, setNote] = useState<NoteWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);

  const isProcessing = note
    ? ["queued", "downloading", "transcribing", "summarising"].includes(
        note.status,
      )
    : false;
  const isFailed = note?.status === "failed";

  const [folderPickerVisible, setFolderPickerVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchNote = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNoteById(noteId);
      setNote(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load note");
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Poll job status while note is processing
  useEffect(() => {
    if (!note || !isProcessing) return;

    setJobLoading(true);

    // Immediate fetch
    getJobStatus(noteId)
      .then((j) => {
        setJob(j);
        setJobLoading(false);
      })
      .catch(() => setJobLoading(false));

    // Poll every 4 seconds
    const poll = setInterval(async () => {
      try {
        const j = await getJobStatus(noteId);
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          clearInterval(poll);
          // Refetch the note to get the completed content
          fetchNote();
        }
      } catch {
        /* non-fatal */
      }
    }, 4000);

    // Realtime subscription
    const channel = subscribeToJob(noteId, (updatedJob) => {
      setJob(updatedJob);
      if (updatedJob.status === "done" || updatedJob.status === "failed") {
        clearInterval(poll);
        fetchNote();
      }
    });

    return () => {
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [note?.status]);

  const handleShare = async () => {
    if (!note) return;
    await Share.share({
      title: note.title ?? "ReelNote",
      message: `${note.title}\n\n${note.summary}\n\nSource: ${note.source_url}`,
    });
  };

  const handleOpenSource = async () => {
    if (!note?.source_url) return;
    const supported = await Linking.canOpenURL(note.source_url);
    if (supported) await Linking.openURL(note.source_url);
    else Alert.alert("Cannot open URL", note.source_url);
  };

  // Header scroll animations
  const headerBg = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ["transparent", theme.base],
    extrapolate: "clamp",
  });
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [80, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const thumbnailScale = scrollY.interpolate({
    inputRange: [-80, 0],
    outputRange: [1.1, 1],
    extrapolate: "clamp",
  });
  const thumbnailOpacity = scrollY.interpolate({
    inputRange: [0, 250],
    outputRange: [1, 0.5],
    extrapolate: "clamp",
  });

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBg }]}>
        <ActivityIndicator color={theme.accentPrimary} size="large" />
      </View>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────
  if (error || !note) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBg }]}>
        <View style={[styles.errorIcon, { backgroundColor: theme.errorBg }]}>
          <Text style={[styles.errorIconText, { color: theme.error }]}>!</Text>
        </View>
        <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>
          Failed to load note
        </Text>
        <Text style={[styles.errorSub, { color: theme.textMuted }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.errorBtn, { borderColor: theme.accentPrimary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.errorBtnText, { color: theme.accentPrimary }]}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Markdown styles (inline so theme is accessible) ─────────────
  const mdStyles = {
    body: {
      ...ui.bodyMd,
      color: theme.textPrimary,
      lineHeight: 26,
    },
    heading1: {
      ...display.heading,
      color: theme.textPrimary,
      marginBottom: spacing[2],
      marginTop: spacing[4],
    },
    heading2: {
      ...display.subheading,
      color: theme.textPrimary,
      marginBottom: spacing[2],
      marginTop: spacing[3],
    },
    heading3: {
      ...ui.bodyMd,
      fontWeight: "600" as const,
      color: theme.textPrimary,
      marginBottom: spacing[1],
      marginTop: spacing[3],
    },
    strong: {
      fontWeight: "700" as const,
      color: theme.textPrimary,
    },
    em: {
      fontStyle: "italic" as const,
      color: theme.textSecondary,
    },
    bullet_list: { marginVertical: spacing[2] },
    ordered_list: { marginVertical: spacing[2] },
    list_item: {
      ...ui.bodyMd,
      color: theme.textPrimary,
      lineHeight: 24,
      marginBottom: spacing[1],
    },
    bullet_list_icon: {
      color: theme.textMuted,
      fontWeight: "700" as const,
      marginRight: spacing[2],
    },
    blockquote: {
      backgroundColor: theme.overlay,
      borderLeftColor: theme.accentPrimary,
      borderLeftWidth: 3,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radius.sm,
      marginVertical: spacing[2],
    },
    code_inline: {
      fontFamily: "monospace",
      backgroundColor: theme.overlay,
      color: theme.accentHighlight,
      paddingHorizontal: spacing[1],
      borderRadius: radius.sm,
      fontSize: 13,
    },
    fence: {
      backgroundColor: theme.overlay,
      padding: spacing[3],
      borderRadius: radius.md,
      marginVertical: spacing[2],
      borderWidth: 0.5,
      borderColor: theme.borderDefault,
    },
    code_block: {
      fontFamily: "monospace",
      color: theme.textSecondary,
      fontSize: 13,
    },
    hr: {
      backgroundColor: theme.borderSubtle,
      height: 0.5,
      marginVertical: spacing[4],
    },
    paragraph: {
      marginBottom: spacing[3],
      marginTop: 0,
    },
    link: {
      color: theme.accentHighlight,
      textDecorationLine: "underline" as const,
    },
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.appBg }]}
      edges={["top"]}
    >
      {/* Floating header */}
      <Animated.View
        style={[styles.header, { backgroundColor: headerBg, top: insets.top }]}
      >
        <Animated.View
          style={[
            styles.headerBorder,
            {
              backgroundColor: theme.borderSubtle,
              opacity: headerBorderOpacity,
            },
          ]}
        />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerBtnText, { color: theme.accentPrimary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setFolderPickerVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[styles.headerBtnText, { color: theme.accentPrimary }]}
            >
              📁
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[styles.headerBtnText, { color: theme.accentPrimary }]}
            >
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Scroll content */}
      <Animated.ScrollView
        contentContainerStyle={[{ paddingBottom: insets.bottom + spacing[10] }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* Thumbnail hero */}
        {note.thumbnail_url ? (
          <TouchableOpacity
            onPress={handleOpenSource}
            activeOpacity={0.92}
            style={styles.thumbnailWrap}
          >
            <Animated.Image
              source={{ uri: note.thumbnail_url }}
              style={[
                styles.thumbnail,
                {
                  transform: [{ scale: thumbnailScale }],
                  opacity: thumbnailOpacity,
                },
              ]}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay} />
            <View
              style={[
                styles.playBtn,
                {
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderColor: theme.accentPrimary,
                },
              ]}
            >
              <Text style={[styles.playIcon, { color: theme.accentPrimary }]}>
                ▶
              </Text>
            </View>
            <View
              style={[styles.sourcePill, { borderColor: theme.accentPrimary }]}
            >
              <Text
                style={[
                  styles.sourcePillText,
                  { color: theme.accentSecondary },
                ]}
              >
                View on Instagram ↗
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sourceFallback,
              {
                backgroundColor: theme.raised,
                borderColor: theme.borderDefault,
              },
            ]}
            onPress={handleOpenSource}
            activeOpacity={0.8}
          >
            <Text style={styles.sourceFallbackIcon}>🎬</Text>
            <View style={styles.sourceFallbackBody}>
              <Text
                style={[styles.sourceFallbackLabel, { color: theme.textMuted }]}
              >
                Original Reel
              </Text>
              <Text
                style={[
                  styles.sourceFallbackUrl,
                  { color: theme.accentHighlight },
                ]}
                numberOfLines={1}
              >
                {note.source_url}
              </Text>
            </View>
            <Text
              style={[styles.sourceFallbackArrow, { color: theme.textMuted }]}
            >
              ↗
            </Text>
          </TouchableOpacity>
        )}

        {/* Body */}
        <View style={styles.body}>
          {/* Title */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {note.title ?? (isProcessing ? "Processing…" : "Untitled")}
          </Text>

          {/* Folder + tags */}
          {!isProcessing && (
            <View style={styles.metaRow}>
              {note.folder && (
                <TouchableOpacity
                  style={[
                    styles.folderChip,
                    {
                      backgroundColor: theme.accentSubtle,
                      borderColor: theme.accentPrimary,
                    },
                  ]}
                  onPress={() => setFolderPickerVisible(true)}
                >
                  <Text
                    style={[
                      styles.folderChipText,
                      { color: theme.accentPrimary },
                    ]}
                  >
                    📁 {note.folder.name}
                  </Text>
                </TouchableOpacity>
              )}
              {(note.tags ?? []).map((tag) => (
                <View
                  key={tag.id}
                  style={[styles.tagChip, { backgroundColor: theme.overlay }]}
                >
                  <Text
                    style={[styles.tagChipText, { color: theme.textMuted }]}
                  >
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Date */}
          <Text style={[styles.date, { color: theme.textMuted }]}>
            {new Date(note.created_at).toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>

          <View
            style={[styles.divider, { backgroundColor: theme.borderSubtle }]}
          />

          {/* ── Processing state ── */}
          {isProcessing && (
            <View style={styles.processingSection}>
              {/* Status pill */}
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: theme.accentPrimary },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: theme.accentPrimary },
                  ]}
                >
                  {STAGE_LABELS[note.status] ?? "Processing…"}
                </Text>
              </View>

              {/* Progress bar */}
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.overlay },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.accentPrimary,
                      width: `${job?.progress ?? 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressPct, { color: theme.textMuted }]}>
                {job?.progress ?? 0}%
              </Text>

              {/* Steps */}
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
                  const p = job?.progress ?? 0;
                  const isDone = p >= step.doneAt;
                  const isActive = p >= step.activeAt && !isDone;
                  return (
                    <View
                      key={step.label}
                      style={[
                        styles.stepRow,
                        i < STEPS.length - 1 && {
                          borderBottomWidth: 0.5,
                          borderBottomColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.stepIcon,
                          {
                            backgroundColor: isDone
                              ? theme.accentPrimary
                              : isActive
                                ? theme.accentSubtle
                                : theme.overlay,
                            borderColor:
                              isDone || isActive
                                ? theme.accentPrimary
                                : theme.borderDefault,
                          },
                        ]}
                      >
                        {isDone ? (
                          <Text
                            style={[
                              styles.stepCheck,
                              { color: theme.textInverse },
                            ]}
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
                          <Text
                            style={[styles.stepNum, { color: theme.textMuted }]}
                          >
                            {i + 1}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          {
                            color: isDone
                              ? theme.textPrimary
                              : isActive
                                ? theme.accentHighlight
                                : theme.textMuted,
                            flex: 1,
                            fontWeight: isDone || isActive ? "500" : "400",
                          },
                        ]}
                      >
                        {step.label}
                      </Text>
                      {isDone && (
                        <Text
                          style={[
                            styles.stepStatus,
                            { color: theme.accentPrimary },
                          ]}
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
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.processingHint, { color: theme.textMuted }]}>
                This page will update automatically when your note is ready.
              </Text>
            </View>
          )}

          {/* ── Failed state ── */}
          {isFailed && (
            <View
              style={[
                styles.failedCard,
                {
                  backgroundColor: theme.errorBg,
                  borderColor: theme.error,
                },
              ]}
            >
              <Text style={[styles.failedTitle, { color: theme.error }]}>
                Processing failed
              </Text>
              <Text style={[styles.failedSub, { color: theme.textSecondary }]}>
                {note.error_message ??
                  "Something went wrong while processing this reel."}
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { borderColor: theme.error }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.retryBtnText, { color: theme.error }]}>
                  Go back
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Done state ── */}
          {note.status === "done" && (
            <>
              {/* Summary */}
              {note.summary ? (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.accentPrimary },
                    ]}
                  >
                    Summary
                  </Text>
                  <Markdown style={mdStyles}>{note.summary}</Markdown>
                </View>
              ) : null}

              {/* Key points */}
              {note.key_points && note.key_points.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.accentPrimary },
                    ]}
                  >
                    Key Points
                  </Text>
                  <View style={styles.pointsList}>
                    {note.key_points.map((point, i) => (
                      <View key={i} style={styles.pointRow}>
                        <View
                          style={[
                            styles.pointDot,
                            { backgroundColor: theme.accentPrimary },
                          ]}
                        />
                        <Text
                          style={[
                            styles.pointText,
                            { color: theme.textPrimary },
                          ]}
                        >
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action items */}
              {note.action_items && note.action_items.length > 0 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.accentPrimary },
                    ]}
                  >
                    Action Items
                  </Text>
                  <View style={styles.pointsList}>
                    {note.action_items.map((item, i) => (
                      <View key={i} style={styles.pointRow}>
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: theme.accentPrimary },
                          ]}
                        />
                        <Text
                          style={[
                            styles.pointText,
                            { color: theme.textPrimary },
                          ]}
                        >
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Source card */}
              {note.thumbnail_url && (
                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    {
                      backgroundColor: theme.raised,
                      borderColor: theme.borderDefault,
                    },
                  ]}
                  onPress={handleOpenSource}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: note.thumbnail_url }}
                    style={styles.sourceCardThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.sourceCardBody}>
                    <Text
                      style={[
                        styles.sourceCardLabel,
                        { color: theme.textMuted },
                      ]}
                    >
                      Original source
                    </Text>
                    <Text
                      style={[
                        styles.sourceCardUrl,
                        { color: theme.accentHighlight },
                      ]}
                      numberOfLines={2}
                    >
                      {note.source_url}
                    </Text>
                  </View>
                  <Text
                    style={[styles.sourceCardArrow, { color: theme.textMuted }]}
                  >
                    ↗
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Folder picker */}
      {user && (
        <FolderPickerModal
          visible={folderPickerVisible}
          userId={user.id}
          noteId={note.id}
          currentFolderId={note.folder_id}
          onClose={() => setFolderPickerVisible(false)}
          onMoved={(folder) => {
            setNote((prev) =>
              prev ? { ...prev, folder, folder_id: folder.id } : prev,
            );
            setFolderPickerVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[4],
    padding: spacing[8],
  },

  // Error
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  errorIconText: {
    ...display.heading,
    fontWeight: "700",
  },
  errorTitle: {
    ...display.subheading,
    textAlign: "center",
  },
  errorSub: {
    ...ui.secondary,
    textAlign: "center",
  },
  errorBtn: {
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  errorBtnText: {
    ...ui.body,
    fontWeight: "500",
  },

  // Header
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
  headerBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  headerBtnText: {
    ...ui.navAction,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },

  // Thumbnail
  thumbnailWrap: {
    width: "100%",
    height: 300,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -28,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    fontSize: 18,
    marginLeft: 3,
  },
  sourcePill: {
    position: "absolute",
    bottom: spacing[4],
    right: spacing[4],
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 0.5,
  },
  sourcePillText: {
    ...ui.caption,
  },

  // Source fallback
  sourceFallback: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing[5],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 0.5,
    gap: spacing[3],
  },
  sourceFallbackIcon: { fontSize: 28 },
  sourceFallbackBody: { flex: 1 },
  sourceFallbackLabel: {
    ...ui.caption,
    marginBottom: 2,
  },
  sourceFallbackUrl: {
    ...ui.body,
  },
  sourceFallbackArrow: {
    fontSize: 18,
  },

  // Body
  body: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  title: {
    ...display.noteTitle,
    marginBottom: spacing[4],
  },

  // Meta
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  folderChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 0.5,
  },
  folderChipText: {
    ...ui.tag,
  },
  tagChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  tagChipText: {
    ...ui.tag,
  },
  date: {
    ...ui.caption,
    marginBottom: spacing[5],
  },
  divider: {
    height: 0.5,
    marginBottom: spacing[6],
  },

  // Sections
  section: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    ...ui.sectionLabel,
    marginBottom: spacing[3],
  },

  // Points
  pointsList: { gap: spacing[3] },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  pointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    flexShrink: 0,
  },
  pointText: {
    ...ui.bodyMd,
    flex: 1,
    lineHeight: 24,
  },

  // Checkboxes
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    marginTop: 3,
    flexShrink: 0,
  },

  // Source card
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: "hidden",
    marginTop: spacing[2],
  },
  sourceCardThumb: {
    width: 96,
    height: 96,
  },
  sourceCardBody: {
    flex: 1,
    paddingHorizontal: spacing[3],
  },
  sourceCardLabel: {
    ...ui.caption,
    marginBottom: 3,
  },
  sourceCardUrl: {
    ...ui.body,
  },
  sourceCardArrow: {
    fontSize: 18,
    paddingRight: spacing[4],
  },

  // Processing
  processingSection: {
    gap: spacing[5],
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    ...ui.body,
    fontWeight: "500",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  progressPct: {
    ...ui.caption,
    marginTop: -spacing[3],
    alignSelf: "flex-end",
  },
  stepsCard: {
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
  },
  stepStatus: {
    ...ui.caption,
  },
  processingHint: {
    ...ui.caption,
    textAlign: "center",
    lineHeight: 18,
  },

  // Failed
  failedCard: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing[5],
    gap: spacing[3],
    alignItems: "center",
  },
  failedTitle: {
    ...display.subheading,
  },
  failedSub: {
    ...ui.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  retryBtnText: {
    ...ui.body,
    fontWeight: "500",
  },
});
