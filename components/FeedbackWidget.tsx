import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NoteFeedback } from "../types/database";
import { display, radius, spacing, ui, useTheme } from "../theme";
import { useEffect, useState } from "react";
import { Button, Text, TextInput } from "../theme/components";
import { useNetwork } from "../hooks/useNetwork";
import { Cache } from "../lib/cache";
import { getNoteFeedback, submitNoteFeedback } from "../lib/db";
import { toast } from "./Toast";
import { posthog } from "../lib/posthog";

type FeedbackModalProps = {
  visible: boolean;
  noteId: string;
  currentFeedback: FeedbackData | null;
  currentReason: string;
  onClose: () => void;
  onSubmit: (feedback: NoteFeedback, reason: string) => Promise<void>;
};

// function FeedbackModal({
//   visible,
//   noteId,
//   currentFeedback,
//   currentReason,
//   onClose,
//   onSubmit,
// }: FeedbackModalProps) {
//   const { theme } = useTheme();
//   const [selected, setSelected] = useState<NoteFeedback | null>(
//     currentFeedback,
//   );
//   const [reason, setReason] = useState(currentReason);
//   const [loading, setLoading] = useState(false);

//   // Reset state when modal opens
//   useEffect(() => {
//     if (visible) {
//       setSelected(currentFeedback);
//       setReason(currentReason);
//     }
//   }, [visible]);

//   const handleSubmit = async () => {
//     if (!selected || loading) return;
//     setLoading(true);
//     try {
//       await onSubmit(selected, reason);
//       onClose();
//     } catch {
//       // Error handled in parent
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (

//   );
// }

interface FeedbackWidgetProps {
  noteId: string;
  userId: string;
}

type FeedbackData = { is_helpful: boolean; explanation: string | null };

export default function FeedbackWidget({
  noteId,
  userId,
}: FeedbackWidgetProps) {
  const { isOffline } = useNetwork();
  const { theme } = useTheme();

  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [rating, setRating] = useState<"helpful" | "missed_information" | null>(
    null,
  );
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string>("");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true); // Prevent UI flicker

  const cacheKey = `feedback_${noteId}_${userId}`;

  // Initialization Hook (Offline-Ready)
  useEffect(() => {
    let isMounted = true;

    const loadExistingFeedback = async () => {
      try {
        // 1. Optimistic Cache Read
        const cached = await Cache.get<FeedbackData>(cacheKey);
        if (cached && isMounted) {
          setFeedback(cached);
          setRating(cached.is_helpful ? "helpful" : "missed_information");
          setExplanation(cached.explanation || "");
          setIsLoading(false);
        }

        if (isOffline) return;

        // 2. Background Revalidation
        const freshData = await getNoteFeedback(noteId, userId);

        if (freshData && isMounted) {
          setFeedback(freshData);
          setRating(freshData.is_helpful ? "helpful" : "missed_information");
          setExplanation(freshData.explanation || "");
          await Cache.set(cacheKey, freshData);
        }
      } catch (error) {
        console.warn("Could not load feedback state");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadExistingFeedback();

    return () => {
      isMounted = false; // Cleanup to prevent memory leaks if user navigates away fast
    };
  }, [noteId, userId, isOffline]);

  useEffect(() => {
    // const isHelpful =
    //   rating === "helpful"
    //     ? true
    //     : rating === "missed_information"
    //       ? false
    //       : null;
    const localFeedbackObj: FeedbackData = {
      is_helpful: rating === "helpful" ? true : false,
      explanation: explanation,
    };

    if (!feedback) {
      setIsSubmitDisabled(rating === null); // Disable if no rating selected
    } else {
      const normalizedLocalExplanation = localFeedbackObj.explanation || "";
      const normalizedFeedbackExplanation = feedback.explanation || "";

      setIsSubmitDisabled(
        localFeedbackObj.is_helpful === feedback.is_helpful &&
          normalizedLocalExplanation === normalizedFeedbackExplanation,
      );
    }
  }, [rating, explanation, feedback]);

  const handleSubmit = async () => {
    if (!rating || isOffline) return;

    setIsLoading(true);
    try {
      const isHelpful = rating === "helpful";
      await submitNoteFeedback(noteId, userId, isHelpful, explanation);

      posthog.capture("note_feedback_submitted", {
        note_id: noteId,
        is_helpful: isHelpful,
        has_explanation: explanation.length > 0,
      });

      // Update local cache so it persists offline immediately
      await Cache.set(cacheKey, { is_helpful: isHelpful, explanation });
      setFeedback({ is_helpful: isHelpful, explanation });
      toast.info("Feedback submitted", {
        description: "Thanks for helping us improve.",
      });
      setFeedbackModalOpen(false);
    } catch (error) {
      toast.error("Failed to save feedback");
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent the widget from rendering empty and then popping into the "Submitted" state
  if (isLoading && !rating) {
    return null;
  }

  return (
    <>
      {/* Feedback trigger */}
      {feedback ? (
        // Already submitted — show compact confirmed state
        <TouchableOpacity
          style={[
            styles.feedbackConfirmedRow,
            {
              backgroundColor: theme.raised,
              borderColor: theme.borderDefault,
            },
          ]}
          onPress={() => setFeedbackModalOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.feedbackConfirmedEmoji}>
            {feedback.is_helpful ? "👍" : "👎"}
          </Text>
          <View style={styles.feedbackConfirmedBody}>
            <Text
              style={[
                styles.feedbackConfirmedText,
                { color: theme.textPrimary },
              ]}
            >
              {feedback.is_helpful
                ? "You've marked this as helpful"
                : "You've marked this as missed info"}
            </Text>
            {feedback.explanation ? (
              <Text
                style={[
                  styles.feedbackConfirmedReason,
                  { color: theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {feedback.explanation}
              </Text>
            ) : null}
          </View>
          <Text
            style={[styles.feedbackEditBtn, { color: theme.accentHighlight }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
      ) : (
        // Not yet submitted
        <TouchableOpacity
          style={[
            styles.feedbackTrigger,
            {
              backgroundColor: theme.raised,
              borderColor: theme.borderDefault,
            },
          ]}
          onPress={() => setFeedbackModalOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.feedbackTriggerEmoji}>💬</Text>
          <Text
            style={[styles.feedbackTriggerText, { color: theme.textMuted }]}
          >
            Was this note useful?
          </Text>
          <Text
            style={[
              styles.feedbackTriggerCta,
              { color: theme.accentHighlight },
            ]}
          >
            Give feedback
          </Text>
        </TouchableOpacity>
      )}

      {/* Feedback modal */}
      <Modal
        visible={feedbackModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Backdrop tap to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFeedbackModalOpen(false)}
          />

          {/* Modal card */}
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.raised,
                borderColor: theme.borderDefault,
                shadowColor: theme.shadow,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Rate this note
              </Text>
              <TouchableOpacity
                onPress={() => setFeedbackModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.modalClose, { color: theme.textMuted }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Your feedback helps improve knowledge extraction.
            </Text>

            {/* Feedback buttons */}
            <View style={styles.modalFeedbackBtns}>
              <TouchableOpacity
                style={[
                  styles.modalFeedbackBtn,
                  {
                    backgroundColor:
                      rating === "helpful" ? theme.accentSubtle : theme.overlay,
                    borderColor:
                      rating === "helpful"
                        ? theme.accentPrimary
                        : theme.borderDefault,
                  },
                ]}
                onPress={() =>
                  setRating(rating === "helpful" ? null : "helpful")
                }
                activeOpacity={0.7}
              >
                <Text style={styles.modalFeedbackEmoji}>👍</Text>
                <Text
                  style={[
                    styles.modalFeedbackLabel,
                    {
                      color:
                        rating === "helpful"
                          ? theme.accentPrimary
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Helpful
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalFeedbackBtn,
                  {
                    backgroundColor:
                      rating === "missed_information"
                        ? theme.errorBg
                        : theme.overlay,
                    borderColor:
                      rating === "missed_information"
                        ? theme.error
                        : theme.borderDefault,
                  },
                ]}
                onPress={() =>
                  setRating(
                    rating === "missed_information"
                      ? null
                      : "missed_information",
                  )
                }
                activeOpacity={0.7}
              >
                <Text style={styles.modalFeedbackEmoji}>👎</Text>
                <Text
                  style={[
                    styles.modalFeedbackLabel,
                    {
                      color:
                        rating === "missed_information"
                          ? theme.error
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Missed info
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reason input */}
            <View style={styles.modalInputWrap}>
              <Text
                style={[styles.modalInputLabel, { color: theme.textMuted }]}
              >
                {rating === "helpful"
                  ? "What was most useful? (optional)"
                  : rating === "missed_information"
                    ? "What information was missing? (optional)"
                    : "Tell us more (optional)"}
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.overlay,
                    borderColor: theme.borderDefault,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder="Share your thoughts…"
                placeholderTextColor={theme.textMuted}
                value={explanation}
                onChangeText={setExplanation}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[styles.modalCharCount, { color: theme.textMuted }]}>
                {explanation?.length}/500
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              {/* <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: theme.borderDefault },
                ]}
                onPress={() => setFeedbackModalOpen(false)}
              >
                <Text
                  style={[styles.modalCancelText, { color: theme.textMuted }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity> */}

              <Button
                label="Cancel"
                style={{ flex: 1, borderColor: theme.borderDefault }}
                variant="secondary"
                onPress={() => setFeedbackModalOpen(false)}
              />
              <Button
                variant="primary"
                label="Submit"
                loading={isLoading}
                disabled={isSubmitDisabled || isLoading || !rating}
                style={{ flex: 1 }}
                onPress={handleSubmit}
              />

              {/* <Button
                label="Submit"
                onPress={handleSubmit}
                disabled={isSubmitDisabled || isLoading}
                loading={isLoading}
                style={{ flex: 1 }}
              /> */}
              {/* <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  {
                    backgroundColor: rating
                      ? theme.accentPrimary
                      : theme.borderStrong,
                    opacity: isLoading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={true}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.modalSubmitText,
                      { color: theme.textInverse },
                    ]}
                  >
                    Submit
                  </Text>
                )}
              </TouchableOpacity> */}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedbackTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  feedbackTriggerEmoji: {
    fontSize: 18,
  },
  feedbackTriggerText: {
    ...ui.body,
    flex: 1,
  },
  feedbackTriggerCta: {
    ...ui.body,
    fontWeight: "500",
  },

  // Feedback confirmed
  feedbackConfirmedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  feedbackConfirmedEmoji: {
    fontSize: 20,
  },
  feedbackConfirmedBody: {
    flex: 1,
    gap: 2,
  },
  feedbackConfirmedText: {
    ...ui.body,
    fontWeight: "500",
  },
  feedbackConfirmedReason: {
    ...ui.caption,
    fontStyle: "italic",
  },
  feedbackEditBtn: {
    ...ui.body,
    fontWeight: "500",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: spacing[5],
  },
  modalCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 0.5,
    padding: spacing[5],
    gap: spacing[4],
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    ...display.subheading,
  },
  modalClose: {
    ...ui.body,
    padding: spacing[1],
  },
  modalSub: {
    ...ui.secondary,
    marginTop: -spacing[2],
  },
  modalFeedbackBtns: {
    flexDirection: "row",
    gap: spacing[3],
  },
  modalFeedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  modalFeedbackEmoji: {
    fontSize: 18,
  },
  modalFeedbackLabel: {
    ...ui.body,
    fontWeight: "500",
  },
  modalInputWrap: {
    gap: spacing[2],
  },
  modalInputLabel: {
    ...ui.caption,
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
    minHeight: 88,
    ...ui.body,
    lineHeight: 22,
  },
  modalCharCount: {
    ...ui.caption,
    textAlign: "right",
    marginTop: -spacing[1],
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[1],
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    ...ui.body,
    fontWeight: "500",
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    ...ui.body,
    fontWeight: "500",
  },
});
