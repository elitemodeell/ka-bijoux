import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type MasonryColumnsProps<T> = {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  columnGap?: number;
  rowGap?: number;
};

/** Short, already-paginated showcases (Home/related items) with independent column heights. */
export function MasonryColumns<T>({
  data,
  keyExtractor,
  renderItem,
  columnGap = 8,
  rowGap = 8,
}: MasonryColumnsProps<T>) {
  const indexed = data.map((item, index) => ({ item, index }));
  const columns = [indexed.filter(({ index }) => index % 2 === 0), indexed.filter(({ index }) => index % 2 === 1)];
  return (
    <View style={[styles.columns, { columnGap }]}>
      {columns.map((items, columnIndex) => (
        <View key={columnIndex} style={[styles.column, { rowGap }]}>
          {items.map(({ item, index }) => {
            return <View key={keyExtractor(item)} style={styles.item}>{renderItem(item, index)}</View>;
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1, minWidth: 0 },
  item: { width: "100%" },
});
