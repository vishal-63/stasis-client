import { supabase } from "./supabase";
import type {
  Note,
  NoteWithFolder,
  Folder,
  ProcessingJob,
  Profile,
} from "../types/database";

// ─── Profile ──────────────────────────────────────────────────────────
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Pick<Profile, "full_name" | "avatar_url">>,
): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ─── Folders ──────────────────────────────────────────────────────────
export const getFolders = async (userId: string): Promise<Folder[]> => {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return data ?? [];
};

export const createFolder = async (
  userId: string,
  name: string,
  color = "#14BBA6",
): Promise<Folder> => {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateFolder = async (
  folderId: string,
  updates: Partial<Pick<Folder, "name" | "color">>,
): Promise<Folder> => {
  const { data, error } = await supabase
    .from("folders")
    .update(updates)
    .eq("id", folderId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw error;
};

// ─── Notes ────────────────────────────────────────────────────────────

export const getNotes = async (
  userId: string,
  opts: {
    folderId?: string;
    search?: string;
    sort?: "newest" | "oldest" | "folder";
  } = {},
): Promise<NoteWithFolder[]> => {
  let query = supabase
    .from("notes")
    .select(
      `
      *,
      folder:folders(*)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: opts.sort === "oldest" });

  if (opts.folderId) {
    query = query.eq("folder_id", opts.folderId);
  }

  if (opts.search) {
    query = query.textSearch("fts", opts.search, {
      config: "english",
      type: "websearch",
    });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export const getNoteById = async (
  noteId: string,
): Promise<NoteWithFolder | null> => {
  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      *,
      folder:folders(*)
    `,
    )
    .eq("id", noteId)
    .single();
  if (error) throw error;
  return data;
};

export const getNoteByShareToken = async (
  token: string,
): Promise<NoteWithFolder | null> => {
  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      *,
      folder:folders(*)
    `,
    )
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();
  if (error) throw error;
  return data;
};

export const createNote = async (
  userId: string,
  sourceUrl: string,
): Promise<Note> => {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      source_url: sourceUrl,
      status: "queued",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateNote = async (
  noteId: string,
  updates: Partial<
    Pick<
      Note,
      | "title"
      | "content"
      | "transcript"
      | "key_points"
      | "action_items"
      | "thumbnail_url"
      | "folder_id"
      | "status"
      | "error_message"
      | "is_shared"
    >
  >,
): Promise<Note> => {
  const { data, error } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", noteId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
};

export const toggleNoteSharing = async (
  noteId: string,
  isShared: boolean,
): Promise<Note> => {
  return updateNote(noteId, { is_shared: isShared });
};

export const moveNoteToFolder = async (
  noteId: string,
  folderId: string,
): Promise<void> => {
  const { error } = await supabase
    .from("notes")
    .update({ folder_id: folderId })
    .eq("id", noteId);
  if (error) throw error;
};

// ─── Processing jobs ──────────────────────────────────────────────────

export const getProcessingJob = async (
  noteId: string,
): Promise<ProcessingJob | null> => {
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
};

export const subscribeToJob = (
  noteId: string,
  onUpdate: (job: ProcessingJob) => void,
) => {
  return supabase
    .channel(`job:${noteId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "processing_jobs",
        filter: `note_id=eq.${noteId}`,
      },
      (payload) => onUpdate(payload.new as ProcessingJob),
    )
    .subscribe();
};

// ─── Storage ──────────────────────────────────────────────────────────

export const uploadThumbnail = async (
  userId: string,
  noteId: string,
  uri: string,
): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `${userId}/${noteId}/thumbnail.jpg`;

  const { error } = await supabase.storage
    .from("thumbnails")
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);

  return data.publicUrl;
};

export const deleteThumbnail = async (
  userId: string,
  noteId: string,
): Promise<void> => {
  const { error } = await supabase.storage
    .from("thumbnails")
    .remove([`${userId}/${noteId}/thumbnail.jpg`]);
  if (error) throw error;
};
