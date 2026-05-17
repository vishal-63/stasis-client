export type Note = {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  created_at: string;
  tags: string[];
  folder: string | null;
};

export type SortOption = "newest" | "oldest" | "folder";

export type ProcessingStatus =
  | "idle"
  | "fetching"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "failed";

export interface ShareIntent {
  value?: string;
  text?: string;
  type: "text" | "weburl" | "file";
}
