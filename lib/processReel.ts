import { createNote } from "./db";
import { submitReelForProcessing } from "./api";

export type ProcessReelResult = {
  noteId: string;
};

export async function extractKnowledgeFromUrl(
  userId: string,
  url: string,
): Promise<ProcessReelResult> {
  try {
    // 1. Create a shell note row in Supabase
    const note = await createNote(userId, url);
    console.log("Note created:", note.id);

    // 2. Submit to backend — backend fills in content when done
    // The poller will pick it up when done or even if this fails
    submitReelForProcessing(note.id, url).catch((e) => {
      console.warn("Backend submit failed, poller will retry:", e.message);
    });

    return {
      noteId: note.id,
    };
  } catch (error) {
    console.error("Error in extractKnowledgeFromUrl:", error);
    throw error;
  }
}
