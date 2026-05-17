import { SortOption } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { radius, spacing, ui, useTheme } from "../theme";
import { Text, TextInput } from "../theme/components";

type SearchBarProps = {
  value: string;
  onChangeText: (t: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSortPress: () => void;
  sort: SortOption;
};

export default function BottomSearchBar({
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSortPress,
  sort,
}: SearchBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: theme.base,
          borderTopColor: theme.borderSubtle,
          paddingBottom: insets.bottom + spacing[2],
        },
      ]}
    >
      <TextInput
        containerStyle={{ flex: 1 }}
        inputStyle={[styles.searchInput, { color: theme.textPrimary }]}
        placeholder="Search notes…"
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      <TouchableOpacity
        onPress={onSortPress}
        style={[
          styles.sortBtn,
          {
            backgroundColor: theme.overlay,
            borderColor: theme.borderDefault,
          },
        ]}
      >
        <Text style={[styles.sortBtnText, { color: theme.accentPrimary }]}>
          {sort === "newest" ? "↓" : sort === "oldest" ? "↑" : "⊟"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 0.5,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    gap: spacing[2],
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sortBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
