import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/useTheme";
import { useCartStore } from "@/stores/cartStore";

function TabIcon({ name, focused, label, badge }: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
  badge?: number;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrapper}>
        <Ionicons
          name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
          size={22}
          color={focused ? Colors.primary : Colors.tabInactive}
        />
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { itemCount } = useCartStore();
  const { Colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: Colors.tabBackground, borderTopColor: Colors.border }],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} label="Início" />,
        }}
      />
      <Tabs.Screen
        name="busca"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} label="Buscar" />,
        }}
      />
      <Tabs.Screen
        name="categorias"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} label="Categorias" />,
        }}
      />
      <Tabs.Screen
        name="carrinho"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bag" focused={focused} label="Carrinho" badge={itemCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} label="Perfil" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBackground,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 70,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrapper: { position: "relative" },
  badge: {
    position: "absolute",
    top: -5, right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  tabLabel: { fontSize: 10, color: Colors.tabInactive },
  tabLabelActive: { color: Colors.primary, fontWeight: "600" },
});
