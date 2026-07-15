import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Folder } from "../types/database";
import { createFolder, getFolders, moveNoteToFolder } from "../lib/db";
import { Text, Button } from "../theme/components";
import { display, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { useTheme } from "../theme";
import { Cache } from "../lib/cache";
import { useNetwork } from "../hooks/useNetwork";
import { toast } from "../components/Toast";
import { posthog } from "../lib/posthog";

type Props = {
  visible: boolean;
  userId: string;
  noteId: string;
  currentFolderId?: string | null;
  onClose: () => void;
  onMoved: (folder: Folder) => void;
};

export default function FolderPickerModal({
  visible,
  userId,
  noteId,
  currentFolderId,
  onClose,
  onMoved,
}: Props) {
  const { theme } = useTheme();
  const { isOffline } = useNetwork();
  const insets = useSafeAreaInsets();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    currentFolderId ?? null,
  );
  const slideAnim = useRef(new Animated.Value(400)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      loadFolders();
      setSelectedId(currentFolderId ?? null);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [visible]);

  const loadFolders = async () => {
    const CACHE_KEY = "all_folders";
    setLoading(true);
    try {
      const cachedFolders = await Cache.get<Folder[]>(CACHE_KEY);
      if (cachedFolders && Array.isArray(cachedFolders)) {
        setFolders(cachedFolders);
        setLoading(false);
      }

      if (isOffline) {
        setLoading(false);
        return;
      }

      const freshData = await getFolders(userId);
      if (freshData) {
        setFolders(freshData);
        await Cache.set(CACHE_KEY, freshData);
      }
    } catch (e: any) {
      Alert.alert("Error", "Could not load folders");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (isOffline) {
      toast.error("Offline", {
        description: "Please connect to the internet to create a folder.",
      });
      return;
    }
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const folder = await createFolder(userId, name);
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setSelectedId(folder.id);
    } catch (e: any) {
      Alert.alert("Error", "Failed to create folder. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async () => {
    if (isOffline) {
      toast.error("Offline", {
        description: "Please connect to the internet to move note to a folder.",
      });
      return;
    }
    if (!selectedId) {
      onClose();
      return;
    }
    setMoving(true);
    try {
      await moveNoteToFolder(noteId, selectedId);
      const folder = folders.find((f) => f.id === selectedId)!;
      posthog.capture("note_moved_to_folder", { note_id: noteId, folder_id: selectedId, folder_name: folder.name });
      onMoved(folder);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", "Failed to move note. Please try again.");
    } finally {
      setMoving(false);
    }
  };

  const renderFolder = ({ item }: { item: Folder }) => {
    const isSelected = selectedId === item.id;
    const isCurrent = currentFolderId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.folderRow,
          isSelected && styles.folderRowSelected,
          {
            backgroundColor: theme.overlay,
            borderColor: theme.accentPrimary,
          },
        ]}
        onPress={() => setSelectedId(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <View
          style={[styles.folderIcon, { backgroundColor: item.color + "22" }]}
        >
          <Text style={{ fontSize: 16 }}>📁</Text>
        </View>
        <View style={styles.folderInfo}>
          <Text
            style={[
              styles.folderName,
              isSelected && styles.folderNameSelected,
              {
                color: isSelected ? theme.textPrimary : theme.textSecondary,
              },
            ]}
          >
            {item.name}
          </Text>
          {isCurrent && (
            <Text
              style={[
                styles.currentLabel,
                {
                  color: theme.accentSecondary,
                },
              ]}
            >
              Current folder
            </Text>
          )}
        </View>
        <View
          style={[
            styles.radio,
            {
              borderColor: isSelected
                ? theme.accentSecondary
                : theme.borderStrong,
            },
          ]}
        >
          {isSelected && (
            <View
              style={[
                styles.radioDot,
                {
                  backgroundColor: theme.accentSecondary,
                },
              ]}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + spacing[4],
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.raised,
            borderColor: theme.borderDefault,
          },
        ]}
      >
        {/* Handle */}
        <View
          style={[
            styles.handle,
            {
              backgroundColor: theme.borderStrong,
            },
          ]}
        />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text
            style={[
              styles.sheetTitle,
              {
                color: theme.textPrimary,
              },
            ]}
          >
            Move to folder
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text
              style={[
                styles.closeBtn,
                {
                  color: theme.textMuted,
                },
              ]}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create new folder */}
        <View style={styles.createRow}>
          <TextInput
            ref={inputRef}
            style={[
              styles.createInput,
              {
                color: theme.textPrimary,
                backgroundColor: theme.overlay,
                borderColor: theme.borderDefault,
              },
            ]}
            placeholder="New folder name..."
            placeholderTextColor={theme.textMuted}
            value={newFolderName}
            onChangeText={setNewFolderName}
            returnKeyType="done"
            onSubmitEditing={handleCreateFolder}
            maxLength={50}
          />
          <TouchableOpacity
            style={[
              styles.createBtn,
              {
                backgroundColor: !newFolderName.trim()
                  ? theme.overlay
                  : theme.accentPrimary,
              },
            ]}
            onPress={handleCreateFolder}
            disabled={!newFolderName.trim() || creating}
          >
            <Text
              style={[
                styles.createBtnText,
                {
                  color: theme.textInverse,
                },
              ]}
            >
              {creating ? "..." : "+ Create"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.borderSubtle,
            },
          ]}
        />

        {/* Folder list */}
        {loading ? (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyText,
                {
                  color: theme.textMuted,
                },
              ]}
            >
              Loading folders...
            </Text>
          </View>
        ) : folders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No folders yet. Create one above.
            </Text>
          </View>
        ) : (
          <FlatList
            data={folders}
            keyExtractor={(f) => f.id}
            renderItem={renderFolder}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Cancel"
            variant="ghost"
            onPress={onClose}
            fullWidth={false}
            style={styles.actionBtn}
          />
          <Button
            label={moving ? "Moving..." : "Move note"}
            onPress={handleConfirm}
            disabled={!selectedId || moving}
            loading={moving}
            fullWidth={false}
            style={styles.actionBtn}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 0.5,
    maxHeight: "75%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },

  // Header
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  sheetTitle: {
    ...display.subheading,
  },
  closeBtn: {
    ...ui.body,
    padding: spacing[1],
  },

  // Create
  createRow: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  createInput: {
    flex: 1,
    ...ui.bodyMd,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  createBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    justifyContent: "center",
  },
  createBtnDisabled: {},
  createBtnText: {
    ...ui.button,
  },

  divider: {
    height: 0.5,
    marginVertical: spacing[2],
  },

  // Folder list
  list: {
    paddingHorizontal: spacing[5],
    flexGrow: 0,
    maxHeight: 300,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[1],
  },
  folderRowSelected: {
    borderWidth: 0.5,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  folderInfo: { flex: 1 },
  folderName: {
    ...ui.bodyMd,
  },
  folderNameSelected: {
    fontWeight: "500",
  },
  currentLabel: {
    ...ui.caption,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Empty
  emptyState: {
    paddingVertical: spacing[6],
    alignItems: "center",
  },
  emptyText: {
    ...ui.secondary,
  },

  // Actions
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  actionBtn: {
    flex: 0,
    paddingHorizontal: spacing[5],
  },
});
