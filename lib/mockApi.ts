// lib/mockApi.ts
import { supabase } from "./supabase";

export const submitMockReelForProcessing = async (
  userId: string,
  url: string,
) => {
  try {
    // 1. Create the initial "queued" note
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        source_url: url,
        status: "queued",
        title: "Testing Ad Flow",
      })
      .select()
      .single();

    if (noteError) throw noteError;

    // 2. Create the processing job tracker
    const { error: jobError } = await supabase.from("processing_jobs").insert({
      note_id: note.id,
      user_id: userId,
      status: "queued",
      progress: 0,
      stage: "queued",
    });

    if (jobError) throw jobError;

    // 3. Fire the fake processing loop in the background (do not await this!)
    simulateBackendDelay(note.id);

    // Return the ID so the UI can navigate to the ProcessingScreen
    return { noteId: note.id };
  } catch (error) {
    console.error("Mock API Error:", error);
    throw error;
  }
};

// The fake backend state machine
const simulateBackendDelay = async (noteId: string) => {
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const updateState = async (status: string, progress: number) => {
    // Update job progress for the spinning ring
    await supabase
      .from("processing_jobs")
      .update({ status, stage: status, progress })
      .eq("note_id", noteId);

    // Sync the note status
    if (status !== "done") {
      await supabase.from("notes").update({ status }).eq("id", noteId);
    }
  };

  await delay(2000);
  await updateState("downloading", 20);

  await delay(3000);
  await updateState("transcribing", 50);

  await delay(4000);
  await updateState("extracting", 80);

  await delay(3000);

  // Finalize the note with dummy data
  await supabase
    .from("notes")
    .update({
      status: "done",
      content:
        "## Mock Summary\n\nThis note was generated completely free of charge to test the AdMob UI flow.\n\n* **Bullet 1:** The ad toll works.\n* **Bullet 2:** No API credits were harmed.",
      key_points: ["Tested UI", "Saved Money"],
      thumbnail_url: "https://picsum.photos/400/300",
    })
    .eq("id", noteId);

  await updateState("done", 100);
};
