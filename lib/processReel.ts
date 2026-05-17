import { createNote, createProcessingJob } from "./db";
import { submitReelForProcessing } from "./api";
import { Alert } from "react-native";

export type ProcessReelResult = {
  noteId: string;
  jobId: string;
};

export async function processReelUrl(
  userId: string,
  url: string,
): Promise<ProcessReelResult> {
  try {
    // 1. Create a shell note row in Supabase
    const note = await createNote(userId, url);

    // 2. Create a processing job row
    await createProcessingJob(note.id, userId);
    console.log("Created processing job for note ID:", note.id);

    // 3. Submit to backend — backend fills in content when done
    const response = await submitReelForProcessing(note.id, url);

    return {
      noteId: note.id,
      jobId: response.job_id,
    };
  } catch (error) {
    console.error("Error in processReelUrl:", error);
    throw error;
  }
}
