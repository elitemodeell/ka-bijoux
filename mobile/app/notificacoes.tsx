import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { notificationsApi } from "@/services/api";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PEDIDO_CONFIRMADO: "bag-check",
  PAGAMENTO_APROVADO: "checkmark-circle",
  EM_SEPARACAO: "cube",
  PRONTO_RETIRADA: "storefront",
  SAIU_ENTREGA: "bicycle",
  ENTREGUE: "home",
  PROMOCAO: "pricetag",
  SISTEMA: "information-circle",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function NotificacoesScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await notificationsApi.markRead(id).catch(() => {});
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationsApi.markAllRead().catch(() => {});
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Voltar</Text></TouchableOpacity>
          <Text style={styles.title}>Notificações</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Ler tudo</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Sem notificações</Text>
            <Text style={styles.emptyText}>Você receberá atualizações dos seus pedidos aqui.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => handleMarkRead(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, !item.read && styles.iconBoxUnread]}>
              <Ionicons
                name={TYPE_ICON[item.type] ?? "notifications"}
                size={22}
                color={item.read ? Colors.textMuted : Colors.primary}
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
                {item.title}
              </Text>
              <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingTop: 12, paddingBottom: 8,
  },
  back: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  title: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  markAll: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "600", width: 60, textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.base, gap: 10, paddingBottom: 30 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 10, marginTop: 80 },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: "700", color: Colors.textPrimary },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center" },
  card: {
    flexDirection: "row", gap: 14, alignItems: "flex-start",
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: 14, ...Shadows.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxUnread: { backgroundColor: Colors.pinkSoft },
  cardTitle: { fontSize: FontSizes.sm, fontWeight: "500", color: Colors.textPrimary },
  cardTitleUnread: { fontWeight: "700" },
  cardBody: { fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 18 },
  cardDate: { fontSize: FontSizes.xs, color: Colors.textLight, marginTop: 2 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginTop: 4, flexShrink: 0,
  },
});
