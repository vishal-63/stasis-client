import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";

import { supabase } from "../lib/supabase";
import { getNotes } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import { NoteWithFolder } from "../types/database";
import { RootStackParamList } from "../navigation/RootNavigator";
import { display, fontSize, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { Text, Badge } from "../theme/components";

import FolderDrawer from "./FolderDrawer";
import FolderPickerModal from "./FolderPickerModal";
import { useTheme } from "../theme";
import BottomSearchBar from "../components/SearchBar";
import { useDebounce } from "../hooks/useDebounce";

type SortOption = "newest" | "oldest" | "folder";
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const statusLabel = (status: string) =>
  ({
    queued: "Queued",
    downloading: "Downloading…",
    transcribing: "Transcribing…",
    summarising: "Summarising…",
    failed: "Failed",
  })[status] ?? status;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ─── Note card ────────────────────────────────────────────────────────

type NoteCardProps = {
  item: NoteWithFolder;
  onPress: () => void;
  onLongPress: () => void;
  onMorePress: () => void;
};

function NoteCard({ item, onPress, onLongPress, onMorePress }: NoteCardProps) {
  const { theme } = useTheme();
  const isDone = item.status === "done";
  const isFailed = item.status === "failed";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.borderDefault,
          shadowColor: theme.shadow,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardInner}>
        {/* Thumbnail */}
        {item.thumbnail_url && isDone && (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                { color: isDone ? theme.textPrimary : theme.textMuted },
              ]}
              numberOfLines={2}
            >
              {item.title ?? (isDone ? "Untitled" : "Processing…")}
            </Text>
            <TouchableOpacity
              onPress={onMorePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.moreBtn, { color: theme.textMuted }]}>
                •••
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status badge */}
          {!isDone && (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isFailed
                    ? theme.errorBg
                    : theme.accentSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isFailed ? theme.error : theme.accentPrimary },
                ]}
              >
                {statusLabel(item.status)}
              </Text>
            </View>
          )}

          {/* Summary preview */}
          {isDone && item.summary && (
            <Text
              style={[styles.cardSummary, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.summary.replace(/[#*_~`\-]/g, "").trim()}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            {item.folder && (
              <View
                style={[
                  styles.folderPill,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.folderPillText,
                    { color: theme.accentPrimary },
                  ]}
                >
                  📁 {item.folder.name}
                </Text>
              </View>
            )}
            <Text style={[styles.dateText, { color: theme.textMuted }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "Home">>();

  const [notes, setNotes] = useState<NoteWithFolder[]>([]);
  const [filtered, setFiltered] = useState<NoteWithFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(
    route.params?.activeFolderId ?? null,
  );
  const [sort, setSort] = useState<SortOption>("newest");
  const [searchFocused, setSearchFocused] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [folderPickerNote, setFolderPickerNote] =
    useState<NoteWithFolder | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearchTerm = useDebounce(search, 200);

  // ─── Fetch ───────────────────────────────────────────────────────

  const fetchNotes = useCallback(
    async (folderId?: string | null) => {
      const data = await getNotes(user!.id, {
        folderId:
          (folderId !== undefined ? folderId : activeFolder) ?? undefined,
        sort,
      });
      setNotes(data);
    },
    [user, activeFolder, sort],
  );

  useEffect(() => {
    setLoading(true);
    fetchNotes().finally(() => setLoading(false));
  }, [fetchNotes]);

  // Update useFocusEffect to fetch immediately with the new folder
  useFocusEffect(
    useCallback(() => {
      const activeFolderId = route.params?.activeFolderId;
      if (activeFolderId && activeFolderId !== activeFolder) {
        setActiveFolder(activeFolderId);
        navigation.setParams({ activeFolderId: undefined });
      }
    }, [route.params?.activeFolderId]),
  );

  useEffect(() => {
    if (route.params?.activeFolderId) {
      navigation.setParams({ activeFolderId: undefined });
    }
  }, []);

  useEffect(
    () => console.log("activeFolder changed", activeFolder),
    [activeFolder],
  );

  // ─── Filter ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(notes);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      notes.filter(
        (n) =>
          (n.title ?? "").toLowerCase().includes(q) ||
          (n.summary ?? "").toLowerCase().includes(q),
      ),
    );
  }, [notes, debouncedSearchTerm]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotes(activeFolder);
    setRefreshing(false);
  };

  // ─── Actions ─────────────────────────────────────────────────────

  const deleteNote = async (id: string) => {
    Alert.alert("Delete note", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("notes").delete().eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else setNotes((prev) => prev.filter((n) => n.id !== id));
        },
      },
    ]);
  };

  const shareNote = async (note: NoteWithFolder) => {
    await Share.share({
      title: note.title ?? "Stasis",
      message: `${note.title}\n\n${note.summary}\n\nSource: ${note.source_url}`,
    });
  };

  const showNoteActions = (note: NoteWithFolder) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Share", "Move to folder", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) shareNote(note);
          if (idx === 2) setFolderPickerNote(note);
          if (idx === 3) deleteNote(note.id);
        },
      );
    } else {
      Alert.alert(note.title ?? "Note", undefined, [
        { text: "Share", onPress: () => shareNote(note) },
        { text: "Move to folder", onPress: () => setFolderPickerNote(note) },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNote(note.id),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const showSortOptions = () => {
    const options = ["Newest first", "Oldest first", "By folder", "Cancel"];
    const values: SortOption[] = ["newest", "oldest", "folder"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (idx) => {
          if (idx < 3) setSort(values[idx]);
        },
      );
    } else {
      Alert.alert(
        "Sort by",
        undefined,
        values.map((s, i) => ({ text: options[i], onPress: () => setSort(s) })),
      );
    }
  };

  // ─── Empty state ─────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentSubtle }]}>
        <Text style={[styles.emptyIconText, { color: theme.accentPrimary }]}>
          ◎
        </Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        {search ? "No results found" : "No notes yet"}
      </Text>
      <Text style={[styles.emptySub, { color: theme.textMuted }]}>
        {search
          ? `No notes matching "${search}"`
          : "Share an Instagram Reel to save your first note."}
      </Text>
      {search && (
        <TouchableOpacity
          style={[styles.clearBtn, { borderColor: theme.accentPrimary }]}
          onPress={() => setSearch("")}
        >
          <Text style={[styles.clearBtnText, { color: theme.accentPrimary }]}>
            Clear search
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.appBg }]}
      edges={["top"]}
    >
      {/* Nav bar */}
      <View
        style={[
          styles.nav,
          {
            backgroundColor: theme.base,
            borderBottomColor: theme.borderSubtle,
          },
        ]}
      >
        {/* Left — folder button */}
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={styles.navSideBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.navSideBtnText, { color: theme.accentPrimary }]}>
            ☰
          </Text>
          {activeFolder && (
            <View
              style={[
                styles.folderDot,
                { backgroundColor: theme.accentPrimary },
              ]}
            />
          )}
        </TouchableOpacity>

        {/* Centre — title */}
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>
          Stasis
        </Text>

        {/* Right — placeholder for balance */}
        <View style={styles.navSideBtn} />
      </View>

      {/* Active folder banner */}
      {activeFolder && (
        <TouchableOpacity
          style={[styles.folderBanner, { backgroundColor: theme.accentSubtle }]}
          onPress={() => setDrawerOpen(true)}
        >
          <Text
            style={[styles.folderBannerText, { color: theme.accentPrimary }]}
          >
            📁 Viewing folder
          </Text>
          <TouchableOpacity onPress={() => setActiveFolder(null)}>
            <Text
              style={[styles.folderBannerClear, { color: theme.accentPrimary }]}
            >
              ✕ All notes
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Notes list */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.accentPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NoteCard
              item={item}
              onPress={() =>
                navigation.navigate("NoteDetail", { noteId: item.id })
              }
              onLongPress={() => showNoteActions(item)}
              onMorePress={() => showNoteActions(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accentPrimary}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom search bar */}
      <BottomSearchBar
        value={search}
        onChangeText={setSearch}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        onSortPress={showSortOptions}
        sort={sort}
      />

      {/* Folder drawer */}
      <FolderDrawer
        visible={drawerOpen}
        userId={user!.id}
        activeFolder={activeFolder}
        onSelectFolder={setActiveFolder}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Folder picker modal */}
      {folderPickerNote && (
        <FolderPickerModal
          visible={!!folderPickerNote}
          userId={user!.id}
          noteId={folderPickerNote.id}
          currentFolderId={folderPickerNote.folder_id}
          onClose={() => setFolderPickerNote(null)}
          onMoved={() => {
            setFolderPickerNote(null);
            fetchNotes();
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Nav
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 0.5,
  },
  navTitle: {
    ...display.brandName,
    fontSize: 18,
    textAlign: "center",
    flex: 1,
  },
  navSideBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  navSideBtnText: {
    fontSize: 20,
  },
  folderDot: {
    position: "absolute",
    top: -2,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Folder banner
  folderBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
  },
  folderBannerText: {
    ...ui.body,
    fontWeight: "500",
  },
  folderBannerClear: {
    ...ui.caption,
    fontWeight: "500",
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  list: {
    padding: spacing[4],
    paddingBottom: spacing[4],
  },

  // Note card
  card: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    marginBottom: spacing[3],
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
  },
  thumbnail: {
    width: 90,
    height: "100%",
    minHeight: 90,
  },
  cardContent: {
    flex: 1,
    padding: spacing[3],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  cardTitle: {
    ...display.cardTitle,
    fontSize: fontSize.md,
    flex: 1,
  },
  moreBtn: {
    ...ui.body,
    letterSpacing: 1,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing[2],
  },
  statusText: {
    ...ui.tag,
    fontSize: 11,
  },
  cardSummary: {
    ...ui.secondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing[2],
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[1],
  },
  folderPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  folderPillText: {
    ...ui.tag,
    fontSize: 11,
  },
  dateText: {
    ...ui.caption,
    marginLeft: "auto",
  },

  // Bottom search bar

  // Empty state
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: spacing[8],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  emptyIconText: {
    fontSize: 32,
    lineHeight: 32,
  },
  emptyTitle: {
    ...display.subheading,
    marginBottom: spacing[2],
    textAlign: "center",
  },
  emptySub: {
    ...ui.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  clearBtn: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  clearBtnText: {
    ...ui.body,
    fontWeight: "500",
  },
});
