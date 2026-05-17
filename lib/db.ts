import { supabase } from "./supabase";
import type {
  Note,
  NoteWithTags,
  Folder,
  Tag,
  ProcessingJob,
  Profile,
} from "../types/database";

// ─── PROFILE ──────────────────────────────────────────────────────────
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

// ─── FOLDERS ──────────────────────────────────────────────────────────

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
  color = "#000000",
): Promise<Folder> => {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  // Notes in this folder will have folder_id set to null (set null on delete)
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw error;
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

// ─── TAGS ─────────────────────────────────────────────────────────────

export const getTags = async (userId: string): Promise<Tag[]> => {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return data ?? [];
};

export const createTag = async (
  userId: string,
  name: string,
  color = "#000000",
): Promise<Tag> => {
  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteTag = async (tagId: string): Promise<void> => {
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw error;
};

// ─── NOTES ────────────────────────────────────────────────────────────

export const getNotes = async (
  userId: string,
  opts: {
    folderId?: string;
    tagId?: string;
    search?: string;
    sort?: "newest" | "oldest" | "folder";
  } = {},
): Promise<NoteWithTags[]> => {
  let query = supabase
    .from("notes")
    .select(
      `
      *,
      folder:folders(*),
      note_tags(tag:tags(*))
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: opts.sort === "oldest" });

  if (opts.folderId) {
    query = query.eq("folder_id", opts.folderId);
  }

  if (opts.search) {
    // Use Postgres full-text search
    query = query.textSearch("fts", opts.search, {
      config: "english",
      type: "websearch",
    });
  }

  const { data, error } = await query;
  if (error) throw error;

  // Flatten note_tags join into a tags array
  return (data ?? []).map((note) => ({
    ...note,
    tags: note.note_tags?.map((nt: any) => nt.tag).filter(Boolean) ?? [],
  }));
};

export const getNoteById = async (
  noteId: string,
): Promise<NoteWithTags | null> => {
  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      *,
      folder:folders(*),
      note_tags(tag:tags(*))
    `,
    )
    .eq("id", noteId)
    .single();
  if (error) throw error;
  return {
    ...data,
    tags: data.note_tags?.map((nt: any) => nt.tag).filter(Boolean) ?? [],
  };
};

export const getNoteByShareToken = async (
  token: string,
): Promise<NoteWithTags | null> => {
  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      *,
      folder:folders(*),
      note_tags(tag:tags(*))
    `,
    )
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();
  if (error) throw error;
  return {
    ...data,
    tags: data.note_tags?.map((nt: any) => nt.tag).filter(Boolean) ?? [],
  };
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
      | "summary"
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

// ─── NOTE TAGS ────────────────────────────────────────────────────────

export const setNoteTags = async (
  noteId: string,
  tagIds: string[],
): Promise<void> => {
  // Delete existing tags for this note then re-insert
  const { error: deleteError } = await supabase
    .from("note_tags")
    .delete()
    .eq("note_id", noteId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("note_tags")
    .insert(tagIds.map((tag_id) => ({ note_id: noteId, tag_id })));
  if (insertError) throw insertError;
};

// ─── PROCESSING JOBS ─────────────────────────────────────────────────

export const createProcessingJob = async (
  noteId: string,
  userId: string,
): Promise<ProcessingJob> => {
  const { data, error } = await supabase
    .from("processing_jobs")
    .insert({ note_id: noteId, user_id: userId, status: "queued" })
    .select()
    .single();
  if (error) throw error;
  return data;
};

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

// Subscribe to real-time job updates
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

// ─── STORAGE ──────────────────────────────────────────────────────────

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
