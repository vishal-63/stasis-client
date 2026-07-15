import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from "react-native-google-mobile-ads";
import { supabase } from "./supabase";
import { getAdUnitId } from "./adConfig";

// Preloaded ad instance — load early so it's ready when needed
let rewardedAd: RewardedAd | null = null;
let adLoaded = false;
let adLoading = false;

export async function preloadAd(): Promise<void> {
  if (adLoaded || adLoading) return;
  adLoading = true;

  try {
    rewardedAd = RewardedAd.createForAdRequest(getAdUnitId("rewarded"), {
      requestNonPersonalizedAdsOnly: false,
    });

    await new Promise<void>((resolve, reject) => {
      const unsubLoaded = rewardedAd!.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          adLoaded = true;
          adLoading = false;
          unsubLoaded();
          resolve();
        },
      );
      const unsubError = rewardedAd!.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          adLoading = false;
          adLoaded = false;
          unsubError();
          reject(error);
        },
      );
      rewardedAd!.load();
    });
  } catch (e) {
    adLoading = false;
    console.warn("Ad preload failed:", e);
  }
}

export async function checkAdFreeWindow(
  userId: string,
  adFreeWindowMs: number,
): Promise<boolean> {
  /**
   * Returns true if user is within the 30-minute ad-free window.
   * Checks Supabase profile for last_ad_watched_at.
   */
  try {
    const { data } = await supabase
      .from("profiles")
      .select("last_ad_watched_at")
      .eq("id", userId)
      .single();

    if (!data?.last_ad_watched_at) return false;

    const lastWatched = new Date(data.last_ad_watched_at).getTime();
    return Date.now() - lastWatched < adFreeWindowMs;
  } catch {
    return false;
  }
}

export async function recordAdWatched(
  userId: string,
  noteId: string,
): Promise<void> {
  /**
   * Records that user watched a full ad.
   * - Updates profile last_ad_watched_at (starts 30-min window)
   * - Unlocks the note
   * - Records ad_watched_at on the note
   */
  const now = new Date().toISOString();
  console.log(
    "Recording ad watched for user",
    userId,
    "note",
    noteId,
    "at",
    now,
  );
  await Promise.all([
    // Update profile — starts ad-free window
    supabase
      .from("profiles")
      .update({ last_ad_watched_at: now })
      .eq("id", userId),

    // Unlock the note
    supabase
      .from("notes")
      .update({
        is_locked: false,
        ad_watched_at: now,
      })
      .eq("id", noteId),
  ]);
}

export async function unlockNoteWhenErrorInAd(
  userId: string,
  noteId: string,
): Promise<void> {
  /**
   * Unlocks a note when an error occurs while watching an ad.
   * - Unlocks the note
   */
  console.log("Unlocking note due to ad error", noteId);
  await Promise.all([
    supabase
      .from("notes")
      .update({
        is_locked: false,
      })
      .eq("id", noteId),
  ]);
}

export async function unlockNoteInAdFreeWindow(noteId: string): Promise<void> {
  /**
   * Unlocks a note without requiring an ad (user is in ad-free window).
   */
  console.log("Unlocking note in free window", noteId);
  try {
    await supabase.from("notes").update({ is_locked: false }).eq("id", noteId);
  } catch (err) {
    console.log(err);
  }
}

type ShowAdResult =
  | { watched: true }
  | { watched: false; reason: "not_loaded" | "error" | "dismissed" };

export function showRewardedAd(): Promise<ShowAdResult> {
  return new Promise((resolve) => {
    if (!rewardedAd || !adLoaded) {
      resolve({ watched: false, reason: "not_loaded" });
      return;
    }

    let rewarded = false;

    const unsubRewarded = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        rewarded = true;
        unsubRewarded();
      },
    );

    const unsubClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubClosed();
        // Reset for next use
        adLoaded = false;
        rewardedAd = null;
        // Preload next ad in background
        preloadAd();

        if (rewarded) {
          resolve({ watched: true });
        } else {
          resolve({ watched: false, reason: "dismissed" });
        }
      },
    );

    const unsubError = rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        unsubError();
        adLoaded = false;
        resolve({ watched: false, reason: "error" });
      },
    );

    rewardedAd.show();
  });
}
