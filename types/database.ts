export type NoteStatus =
  | "queued"
  | "downloading"
  | "transcribing"
  | "extracting"
  | "done"
  | "failed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string | null;
  content: string | null;
  transcript: string | null;
  key_points: string[];
  action_items: string[];
  source_url: string;
  thumbnail_url: string | null;
  status: NoteStatus;
  error_message: string | null;
  is_shared: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
};

export type NoteWithFolder = Note & {
  folder: Folder | null;
};

export type ProcessingJob = {
  id: string;
  note_id: string;
  user_id: string;
  status: NoteStatus;
  stage: string | null;
  progress: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
