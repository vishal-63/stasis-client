import { supabase } from "./supabase";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;
const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET!;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error("Not authenticated");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-API-Secret": API_SECRET,
  };
}

export type ProcessResponse = {
  job_id: string;
  note_id: string;
  status: string;
};

export async function submitReelForProcessing(
  noteId: string,
  url: string,
): Promise<ProcessResponse> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`${BACKEND_URL}/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ note_id: noteId, url }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail ?? `Server error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error in submitReelForProcessing:", error);
    throw error;
  }
}

export async function getJobStatus(noteId: string) {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BACKEND_URL}/jobs/${noteId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? `Server error: ${response.status}`);
  }

  return response.json();
}
