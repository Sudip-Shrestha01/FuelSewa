import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useNotificationStore, MobileNotification } from "../../store/notificationStore";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";

const CUSTOMER_TYPES = ["driver_assigned", "in_progress", "delivered", "cancelled"];
const DRIVER_TYPES   = ["order_assigned", "trip_started", "trip_completed"];

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  order_placed:    { icon: "local-gas-station", color: Colors.primary,  bg: Colors.primaryLight },
  order_assigned:  { icon: "assignment-ind",    color: "#3B82F6",        bg: "#DBEAFE" },
  driver_assigned: { icon: "person-pin",        color: "#3B82F6",        bg: "#DBEAFE" },
  in_progress:     { icon: "local-shipping",    color: "#8B5CF6",        bg: "#EDE9FE" },
  delivered:       { icon: "check-circle",      color: Colors.primary,  bg: Colors.primaryLight },
  cancelled:       { icon: "cancel",            color: "#EF4444",        bg: "#FEE2E2" },
  trip_started:    { icon: "directions-car",    color: "#8B5CF6",        bg: "#EDE9FE" },
  trip_completed:  { icon: "check-circle",      color: Colors.primary,  bg: Colors.primaryLight },
  info:            { icon: "notifications",     color: Colors.gray500,   bg: Colors.gray100 },
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const { notifications, markAllRead, clear } = useNotificationStore();
  const user = useAuthStore((s) => s.user);

  // Only show notifications relevant to the current role
  const filtered = notifications.filter((n) => {
    if (user?.role === "driver") return DRIVER_TYPES.includes(n.type) || n.type === "info";
    return CUSTOMER_TYPES.includes(n.type) || n.type === "info";
  });

  const handleClear = () => {
    Alert.alert("Clear Notifications", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clear },
    ]);
  };

  const renderItem = ({ item }: { item: MobileNotification }) => {
    const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
    return (
      <View style={[styles.item, !item.read && styles.itemUnread]}>
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <Icon name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>{filtered.length} total</Text>
        </View>
        <View style={styles.headerActions}>
          {filtered.some((n) => !n.read) && (
            <TouchableOpacity style={styles.actionBtn} onPress={markAllRead}>
              <Text style={styles.actionBtnText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {filtered.length > 0 && (
            <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={handleClear}>
              <Icon name="delete-outline" size={16} color={Colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="notifications-none" size={36} color={Colors.gray300} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>You'll see order updates here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.black },
  headerSub: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: Colors.gray100,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: Colors.gray600 },
  clearBtn: { backgroundColor: "#FEF2F2", paddingHorizontal: 10 },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  item: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", shrinkToFit: true,
  } as any,
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 3 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: "500", color: Colors.gray600 },
  itemTitleUnread: { fontWeight: "700", color: Colors.black },
  itemTime: { fontSize: 11, color: Colors.gray400, shrink: 0 } as any,
  itemBody: { fontSize: 13, color: Colors.gray500, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.gray100,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray600 },
  emptySub: { fontSize: 13, color: Colors.gray400 },
});
