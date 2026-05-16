import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import api from "../../api/axios";
import { Colors } from "../../theme/colors";

interface Order {
  _id: string;
  fuelType: string;
  quantity: number;
  status: string;
  isEmergency: boolean;
  requestSource: string;
  note: string;
  cancelReason?: string;
  pricing: {
    pricePerLiter: number;
    fuelCost: number;
    deliveryFee: number;
    emergencyFee: number;
    totalPrice: number;
  };
  deliveryLocation: {
    address: string;
    landmark: string;
    latitude: number;
    longitude: number;
  };
  assignedDriverId: {
    _id: string;
    firstName: string;
    lastName: string;
    contactNumber: string;
    location?: { latitude: number; longitude: number };
    vehicleInfo?: { vehicleNumber: string; vehicleModel: string };
  } | null;
  estimatedDeliveryMinutes: number | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:     { label: "Pending",     color: "#D97706", bg: "#FEF3C7", icon: "schedule" },
  accepted:    { label: "Accepted",    color: "#2563EB", bg: "#DBEAFE", icon: "thumb-up" },
  in_progress: { label: "On the way",  color: "#7C3AED", bg: "#EDE9FE", icon: "local-shipping" },
  delivered:   { label: "Delivered",   color: Colors.primary, bg: "#D1FAE5", icon: "check-circle" },
  cancelled:   { label: "Cancelled",   color: "#DC2626", bg: "#FEE2E2", icon: "cancel" },
};

const TABS = ["All", "Active", "Completed", "Cancelled"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.gray500, bg: Colors.gray100, icon: "circle" };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Icon name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function OrderDetailModal({ order, onClose, onCancelled }: { order: Order; onClose: () => void; onCancelled: () => void }) {
  const navigation = useNavigation();
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const handleCancelPress = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No, Keep it", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => setShowCancelInput(true) },
      ]
    );
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Reason required", "Please enter a reason for cancellation.");
      return;
    }
    setCancelling(true);
    try {
      await api.patch(`/orders/${order._id}/cancel`, { cancelReason });
      Alert.alert("Order Cancelled", "Your order has been cancelled.", [
        { text: "OK", onPress: () => { onClose(); onCancelled(); } },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={["top"]}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Order Details</Text>
            <Text style={styles.modalId}>#{order._id.slice(-8).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={20} color={Colors.gray700} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <View style={styles.modalStatusRow}>
            <StatusBadge status={order.status} />
            {order.isEmergency && (
              <View style={styles.sosBadge}>
                <Icon name="warning" size={11} color="#DC2626" />
                <Text style={styles.sosText}>Emergency</Text>
              </View>
            )}
          </View>

          {/* Fuel Info */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Fuel Details</Text>
            <View style={styles.detailGrid}>
              <DetailItem label="Fuel Type" value={order.fuelType.charAt(0).toUpperCase() + order.fuelType.slice(1)} />
              <DetailItem label="Quantity" value={`${order.quantity} Liters`} />
              <DetailItem label="Price/Liter" value={`Rs. ${order.pricing.pricePerLiter}`} />
              <DetailItem label="Source" value={order.requestSource} />
            </View>
          </View>

          {/* Location */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Delivery Location</Text>
            <View style={styles.locationRow}>
              <Icon name="location-on" size={16} color={Colors.primary} />
              <Text style={styles.locationText}>{order.deliveryLocation.address}</Text>
            </View>
            {order.deliveryLocation.landmark ? (
              <View style={[styles.locationRow, { marginTop: 6 }]}>
                <Icon name="place" size={16} color={Colors.gray400} />
                <Text style={styles.locationSubText}>{order.deliveryLocation.landmark}</Text>
              </View>
            ) : null}
          </View>

          {/* Driver */}
          {order.assignedDriverId && order.assignedDriverId.firstName ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Assigned Driver</Text>
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>
                    {order.assignedDriverId.firstName[0]?.toUpperCase() ?? "D"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.driverName}>
                    {order.assignedDriverId.firstName} {order.assignedDriverId.lastName}
                  </Text>
                  <Text style={styles.driverPhone}>{order.assignedDriverId.contactNumber ?? "—"}</Text>
                </View>
              </View>
              {order.estimatedDeliveryMinutes ? (
                <View style={styles.etaRow}>
                  <Icon name="access-time" size={14} color={Colors.primary} />
                  <Text style={styles.etaText}>ETA: {order.estimatedDeliveryMinutes} minutes</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Track Order Button — for accepted/in_progress orders */}
          {["accepted", "in_progress"].includes(order.status) && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => {
                onClose();
                // @ts-ignore
                navigation.navigate("Tabs", { screen: "Track", params: { orderId: order._id } });
              }}
            >
              <Icon name="map" size={18} color={Colors.white} />
              <Text style={styles.trackBtnText}>Track Live Order</Text>
            </TouchableOpacity>
          )}

          {/* Pricing */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Price Breakdown</Text>
            <View style={styles.pricingRows}>
              <PricingRow label="Fuel Cost" value={`Rs. ${order.pricing.fuelCost}`} />
              <PricingRow label="Delivery Fee" value={`Rs. ${order.pricing.deliveryFee}`} />
              {order.pricing.emergencyFee > 0 && (
                <PricingRow label="Emergency Fee" value={`Rs. ${order.pricing.emergencyFee}`} highlight />
              )}
              <View style={styles.pricingDivider} />
              <PricingRow label="Total" value={`Rs. ${order.pricing.totalPrice}`} total />
            </View>
          </View>

          {/* Note */}
          {order.note ? (
            <View style={[styles.detailCard, { backgroundColor: "#FFFBEB" }]}>
              <Text style={[styles.detailCardTitle, { color: "#D97706" }]}>Note</Text>
              <Text style={styles.noteText}>{order.note}</Text>
            </View>
          ) : null}

          {/* Cancel Reason (if already cancelled) */}
          {order.status === "cancelled" && order.cancelReason ? (
            <View style={[styles.detailCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Text style={[styles.detailCardTitle, { color: "#DC2626" }]}>Cancellation Reason</Text>
              <Text style={styles.noteText}>{order.cancelReason}</Text>
            </View>
          ) : null}

          {/* Cancel Input */}
          {showCancelInput && (
            <View style={styles.cancelBox}>
              <Text style={styles.cancelBoxTitle}>Reason for Cancellation *</Text>
              <TextInput
                style={styles.cancelInput}
                placeholder="e.g. Changed my mind, ordered by mistake..."
                placeholderTextColor={Colors.gray400}
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.cancelActions}>
                <TouchableOpacity
                  style={styles.cancelBackBtn}
                  onPress={() => { setShowCancelInput(false); setCancelReason(""); }}
                >
                  <Text style={styles.cancelBackText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelConfirmBtn, cancelling && { opacity: 0.6 }]}
                  onPress={handleConfirmCancel}
                  disabled={cancelling}
                >
                  {cancelling
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={styles.cancelConfirmText}>Confirm Cancel</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cancel Button — only for pending orders */}
          {order.status === "pending" && !showCancelInput && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPress} activeOpacity={0.85}>
              <Icon name="cancel" size={18} color={Colors.white} />
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          )}

          {/* Date */}
          <Text style={styles.dateText}>
            Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PricingRow({ label, value, highlight, total }: { label: string; value: string; highlight?: boolean; total?: boolean }) {
  return (
    <View style={styles.pricingRow}>
      <Text style={[styles.pricingKey, highlight && { color: "#D97706" }, total && styles.pricingTotalKey]}>
        {label}
      </Text>
      <Text style={[styles.pricingVal, highlight && { color: "#D97706" }, total && styles.pricingTotalVal]}>
        {value}
      </Text>
    </View>
  );
}

export default function OrdersScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders/my-orders");
      const data = res.data?.data;
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (activeTab === "Active") return ["pending", "accepted", "in_progress"].includes(o.status);
    if (activeTab === "Completed") return o.status === "delivered";
    if (activeTab === "Cancelled") return o.status === "cancelled";
    return true;
  });

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => setSelectedOrder(item)} activeOpacity={0.85}>
      <View style={styles.orderCardTop}>
        <View style={styles.orderIconBox}>
          <Icon name="local-gas-station" size={20} color={Colors.primary} />
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderFuel}>
            {item.fuelType.charAt(0).toUpperCase() + item.fuelType.slice(1)} · {item.quantity}L
          </Text>
          <Text style={styles.orderAddress} numberOfLines={1}>
            {item.deliveryLocation.address}
          </Text>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
        <View style={styles.orderRight}>
          <Text style={styles.orderPrice}>Rs. {item.pricing.totalPrice}</Text>
          <StatusBadge status={item.status} />
        </View>
      </View>
      {["accepted", "in_progress"].includes(item.status) && (
        <TouchableOpacity
          style={styles.cardTrackBtn}
          onPress={() => {
            // @ts-ignore
            navigation.navigate("Track", { orderId: item._id });
          }}
        >
          <Icon name="map" size={14} color={Colors.primary} />
          <Text style={styles.cardTrackBtnText}>Track Driver</Text>
        </TouchableOpacity>
      )}
      {item.isEmergency && (
        <View style={styles.emergencyStrip}>
          <Icon name="warning" size={12} color="#DC2626" />
          <Text style={styles.emergencyStripText}>Emergency Order</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerCount}>{orders.length} total</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => {
            const count = tab === "All" ? orders.length
              : tab === "Active" ? orders.filter((o) => ["pending", "accepted", "in_progress"].includes(o.status)).length
              : tab === "Completed" ? orders.filter((o) => o.status === "delivered").length
              : orders.filter((o) => o.status === "cancelled").length;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab} {count > 0 ? `(${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="receipt-long" size={48} color={Colors.gray300} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your order history will appear here</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onCancelled={fetchOrders}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gray50 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.black },
  headerCount: { fontSize: 13, color: Colors.gray400 },

  // Tabs
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  tabs: { paddingHorizontal: 16, paddingBottom: 0, gap: 6 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200 },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.gray500 },
  tabTextActive: { color: Colors.white },

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12, paddingBottom: 32 },

  // Order Card
  orderCard: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  orderCardTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  orderIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  orderInfo: { flex: 1 },
  orderFuel: { fontSize: 15, fontWeight: "700", color: Colors.black },
  orderAddress: { fontSize: 12, color: Colors.gray500, marginTop: 3, maxWidth: 180 },
  orderDate: { fontSize: 11, color: Colors.gray400, marginTop: 3 },
  orderRight: { alignItems: "flex-end", gap: 6 },
  orderPrice: { fontSize: 15, fontWeight: "800", color: Colors.black },
  emergencyStrip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FEF2F2", paddingHorizontal: 14, paddingVertical: 7,
    borderTopWidth: 1, borderTopColor: "#FECACA",
  },
  emergencyStripText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },

  // Badge
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // Empty
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray600 },
  emptySub: { fontSize: 13, color: Colors.gray400 },

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.white },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.black },
  modalId: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center" },
  modalContent: { padding: 20, gap: 14, paddingBottom: 40 },
  modalStatusRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  sosBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  sosText: { fontSize: 11, fontWeight: "700", color: "#DC2626" },

  // Detail Card
  detailCard: {
    backgroundColor: Colors.gray50, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.gray100,
  },
  detailCardTitle: { fontSize: 12, fontWeight: "700", color: Colors.gray500, textTransform: "uppercase", marginBottom: 10, letterSpacing: 0.5 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailItem: { width: "45%" },
  detailLabel: { fontSize: 11, color: Colors.gray400 },
  detailValue: { fontSize: 14, fontWeight: "600", color: Colors.black, marginTop: 2, textTransform: "capitalize" },

  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  locationText: { flex: 1, fontSize: 14, color: Colors.black, fontWeight: "500" },
  locationSubText: { flex: 1, fontSize: 13, color: Colors.gray500 },

  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  driverAvatarText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  driverName: { fontSize: 14, fontWeight: "700", color: Colors.black },
  driverPhone: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: Colors.primaryLight, padding: 8, borderRadius: 8 },
  etaText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },

  pricingRows: { gap: 8 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between" },
  pricingKey: { fontSize: 13, color: Colors.gray600 },
  pricingVal: { fontSize: 13, fontWeight: "600", color: Colors.black },
  pricingDivider: { height: 1, backgroundColor: Colors.gray200, marginVertical: 4 },
  pricingTotalKey: { fontSize: 15, fontWeight: "700", color: Colors.black },
  pricingTotalVal: { fontSize: 15, fontWeight: "800", color: Colors.primary },

  noteText: { fontSize: 13, color: Colors.gray700, lineHeight: 20 },
  dateText: { fontSize: 12, color: Colors.gray400, textAlign: "center", marginTop: 4 },

  // Cancel
  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#DC2626", borderRadius: 14, paddingVertical: 14,
    shadowColor: "#DC2626", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  cancelBtnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  cancelBox: {
    backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: "#FECACA",
  },
  cancelBoxTitle: { fontSize: 13, fontWeight: "700", color: "#DC2626", marginBottom: 10 },
  cancelInput: {
    backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1.5,
    borderColor: "#FECACA", paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.black, minHeight: 80,
  },
  cancelActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBackBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: 10,
    paddingVertical: 11, alignItems: "center",
  },
  cancelBackText: { fontSize: 14, fontWeight: "600", color: Colors.gray600 },
  cancelConfirmBtn: {
    flex: 1, backgroundColor: "#DC2626", borderRadius: 10,
    paddingVertical: 11, alignItems: "center",
  },
  cancelConfirmText: { fontSize: 14, fontWeight: "700", color: Colors.white },
  
  trackBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.black, borderRadius: 14, paddingVertical: 14,
    marginBottom: 10,
  },
  trackBtnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  
  cardTrackBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderTopWidth: 1, borderTopColor: Colors.gray100,
    paddingVertical: 10,
  },
  cardTrackBtnText: { fontSize: 13, color: Colors.primary, fontWeight: "700" },
});
