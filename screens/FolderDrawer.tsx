import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { Folder } from "../types/database";
import { createFolder, deleteFolder, getFolders } from "../lib/db";
import { Text } from "../theme/components";
import { display, ui } from "../theme/typography";
import { radius, spacing } from "../theme/spacing";
import { useTheme } from "../theme";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.72;

type Props = {
  visible: boolean;
  userId: string;
  activeFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onClose: () => void;
};

export default function FolderDrawer({
  visible,
  userId,
  activeFolder,
  onSelectFolder,
  onClose,
}: Props) {
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFolders();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 240,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await getFolders(userId);
      setFolders(data);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const folder = await createFolder(userId, name);
      setFolders((prev) => [...prev, folder]);
      setNewName("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (folder: Folder) => {
    Alert.alert(
      `Delete "${folder.name}"?`,
      "Notes in this folder will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
              setFolders((prev) => prev.filter((f) => f.id !== folder.id));
              if (activeFolder === folder.id) onSelectFolder(null);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  const renderFolder = ({ item }: { item: Folder }) => {
    const isActive = activeFolder === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.folderRow,
          isActive && styles.folderRowActive,
          {
            backgroundColor: theme.overlay,
            borderColor: theme.accentPrimary,
          },
        ]}
        onPress={() => {
          onSelectFolder(item.id);
          onClose();
        }}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.folderDot, { backgroundColor: item.color }]} />
        <Text
          style={[
            styles.folderName,
            isActive && styles.folderNameActive,
            {
              color: isActive ? theme.textPrimary : theme.textSecondary,
            },
          ]}
        >
          {item.name}
        </Text>
        {isActive && (
          <Text
            style={[
              styles.folderCheck,
              {
                color: theme.accentSecondary,
              },
            ]}
          >
            ✓
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            paddingTop: insets.top + spacing[4],
            paddingBottom: insets.bottom + spacing[4],
            transform: [{ translateX: slideAnim }],
            backgroundColor: theme.raised,
            borderRightColor: theme.borderDefault,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={[styles.drawerTitle, { color: theme.accentSecondary }]}>
            Folders
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeBtn, { color: theme.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* All notes row */}
        <TouchableOpacity
          style={[
            styles.folderRow,
            styles.allNotesRow,
            !activeFolder && styles.folderRowActive,
          ]}
          onPress={() => {
            onSelectFolder(null);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.allNotesIcon,
              {
                color: theme.accentSecondary,
              },
            ]}
          >
            ◎
          </Text>
          <Text
            style={[
              styles.folderName,
              !activeFolder && styles.folderNameActive,
            ]}
          >
            All notes
          </Text>
          {!activeFolder && <Text style={styles.folderCheck}>✓</Text>}
        </TouchableOpacity>

        <View style={[styles.divider]} />

        {/* Folder list */}
        <FlatList
          data={folders}
          keyExtractor={(f) => f.id}
          renderItem={renderFolder}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: theme.textMuted,
                  },
                ]}
              >
                Loading…
              </Text>
            ) : (
              <Text style={styles.emptyText}>
                No folders yet.{"\n"}Create one below.
              </Text>
            )
          }
        />

        <View style={[styles.divider]} />

        {/* Create new folder */}
        <View style={styles.createSection}>
          <Text
            style={[
              styles.createLabel,
              {
                color: theme.textMuted,
              },
            ]}
          >
            New folder
          </Text>
          <View style={styles.createRow}>
            <TextInput
              style={[
                styles.createInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.overlay,
                  borderColor: theme.borderDefault,
                },
              ]}
              placeholder="Folder name…"
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              maxLength={50}
            />
            <TouchableOpacity
              style={[
                styles.createBtn,
                {
                  backgroundColor:
                    !newName.trim() || creating
                      ? theme.overlay
                      : theme.accentPrimary,
                },
              ]}
              onPress={handleCreate}
              disabled={!newName.trim() || creating}
            >
              <Text
                style={[
                  styles.createBtnText,
                  {
                    color: theme.textInverse,
                  },
                ]}
              >
                {creating ? "…" : "+"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Long press hint */}
        <Text
          style={[
            styles.hint,
            {
              color: theme.textMuted,
            },
          ]}
        >
          Long press a folder to delete it
        </Text>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: theme.borderDefault }]}
          onPress={signOut}
        >
          <Text
            style={[
              styles.signOutText,
              {
                color: theme.textMuted,
              },
            ]}
          >
            Sign out
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 0.5,
    zIndex: 11,
    paddingHorizontal: spacing[5],
  },

  // Header
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  drawerTitle: {
    ...display.subheading,
  },
  closeBtn: {
    ...ui.body,
    padding: spacing[1],
  },

  // All notes
  allNotesRow: {
    marginBottom: spacing[1],
  },
  allNotesIcon: {
    fontSize: 14,
    width: 20,
    textAlign: "center",
  },

  // Folder rows
  list: {
    flex: 1,
    marginVertical: spacing[2],
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
  folderRowActive: {
    borderWidth: 0.5,
  },
  folderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  folderName: {
    ...ui.bodyMd,
    flex: 1,
  },
  folderNameActive: {
    fontWeight: "600",
  },
  folderCheck: {
    ...ui.caption,
    fontWeight: "700",
  },

  divider: {
    height: 0.5,
    marginVertical: spacing[2],
  },

  // Create
  createSection: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  createLabel: {
    ...ui.label,
  },
  createRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  createInput: {
    flex: 1,
    ...ui.body,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  createBtn: {
    width: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: {
    ...ui.body,
    fontWeight: "700",
  },
  hint: {
    ...ui.caption,
    textAlign: "center",
    marginTop: spacing[3],
  },
  emptyText: {
    ...ui.secondary,
    textAlign: "center",
    marginTop: spacing[4],
    lineHeight: 22,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 0.5,
    marginTop: spacing[3],
  },
  signOutText: {
    ...ui.body,
  },
});
