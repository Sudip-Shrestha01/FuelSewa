import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";
import api from "../../api/axios";

interface Pricing {
  petrolPricePerLiter: number;
  dieselPricePerLiter: number;
}

interface Order {
  _id: string;
  fuelType: string;
  quantity: number;
  status: string;
  pricing: {
    pricePerLiter: number;
    fuelCost: number;
    deliveryFee: number;
    emergencyFee: number;
    totalPrice: number;
  };
  deliveryLocation: { address: string };
  assignedDriverId: { firstName: string; lastName: string } | null;
  estimatedDeliveryMinutes: number | null;
  createdAt: string;
}

const STATUS_STEPS = ["pending", "accepted", "in_progress", "delivered"];
const STATUS_LABELS = ["Placed", "Assigned", "On the way", "Delivered"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function OrderStatusBar({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <View style={styles.statusBar}>
      {STATUS_LABELS.map((label, i) => (
        <View key={label} style={styles.statusStep}>
          <View style={[styles.statusDot, i <= currentIndex && styles.statusDotActive]}>
            {i <= currentIndex && <Icon name="check" size={10} color={Colors.white} />}
          </View>
          <Text style={[styles.statusLabel, i <= currentIndex && styles.statusLabelActive]}>
            {label}
          </Text>
          {i < STATUS_LABELS.length - 1 && (
            <View style={[styles.statusLine, i < currentIndex && styles.statusLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pricingRes, ordersRes] = await Promise.all([
        api.get("/pricing"),
        api.get("/orders/my-orders"),
      ]);
      setPricing(pricingRes.data?.data ?? null);
      const orders: Order[] = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      const active = orders.find((o) =>
        ["pending", "accepted", "in_progress"].includes(o.status)
      ) ?? null;
      setActiveOrder(active);
      setRecentOrders(
        orders.filter((o) => o.status === "delivered").slice(0, 3)
      );
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleEmergency = () => {
    navigation.navigate("RequestFuel");
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {user?.firstName} 👋</Text>
            <View style={styles.locationRow}>
              <Icon name="location-on" size={14} color={Colors.primary} />
              <Text style={styles.location} numberOfLines={1}>Detecting location...</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => {}}>
            <Icon name="notifications-none" size={24} color={Colors.gray700} />
          </TouchableOpacity>
        </View>

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergency} activeOpacity={0.85}>
          <View style={styles.emergencyInner}>
            <Icon name="local-gas-station" size={36} color={Colors.white} />
            <Text style={styles.emergencyTitle}>Request Emergency Fuel</Text>
            <Text style={styles.emergencySub}>Tap to get fuel delivered to your location now</Text>
          </View>
        </TouchableOpacity>

        {/* Fuel Prices */}
        {pricing && (
          <View>
            <Text style={styles.sectionTitle}>Today's Fuel Prices</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceCard, { backgroundColor: "#FFF7ED" }]}>
                <Icon name="local-gas-station" size={22} color="#EA580C" />
                <Text style={styles.priceLabel}>Petrol</Text>
                <Text style={styles.priceValue}>Rs. {pricing.petrolPricePerLiter}</Text>
                <Text style={styles.priceUnit}>per liter</Text>
              </View>
              <View style={[styles.priceCard, { backgroundColor: "#F0FDF4" }]}>
                <Icon name="local-gas-station" size={22} color={Colors.primary} />
                <Text style={styles.priceLabel}>Diesel</Text>
                <Text style={styles.priceValue}>Rs. {pricing.dieselPricePerLiter}</Text>
                <Text style={styles.priceUnit}>per liter</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Order */}
        {activeOrder && (
          <View style={styles.activeCard}>
            <View style={styles.activeCardHeader}>
              <Text style={styles.activeCardTitle}>Active Order</Text>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Live</Text>
              </View>
            </View>

            <OrderStatusBar status={activeOrder.status} />

            <View style={styles.activeDetails}>
              <View style={styles.activeDetailRow}>
                <Icon name="local-gas-station" size={16} color={Colors.gray500} />
                <Text style={styles.activeDetailText}>
                  {activeOrder.fuelType} · {activeOrder.quantity}L
                </Text>
              </View>
              <View style={styles.activePricingBox}>
                <View style={styles.activePricingRow}>
                  <Text style={styles.activePricingKey}>Fuel Cost</Text>
                  <Text style={styles.activePricingVal}>Rs. {activeOrder.pricing.fuelCost}</Text>
                </View>
                <View style={styles.activePricingRow}>
                  <Text style={styles.activePricingKey}>Delivery Fee</Text>
                  <Text style={styles.activePricingVal}>Rs. {activeOrder.pricing.deliveryFee}</Text>
                </View>
                {activeOrder.pricing.emergencyFee > 0 && (
                  <View style={styles.activePricingRow}>
                    <Text style={[styles.activePricingKey, { color: "#D97706" }]}>Emergency Fee</Text>
                    <Text style={[styles.activePricingVal, { color: "#D97706" }]}>Rs. {activeOrder.pricing.emergencyFee}</Text>
                  </View>
                )}
                <View style={[styles.activePricingRow, styles.activePricingTotal]}>
                  <Text style={styles.activePricingTotalKey}>Total</Text>
                  <Text style={styles.activePricingTotalVal}>Rs. {activeOrder.pricing.totalPrice}</Text>
                </View>
              </View>
              {activeOrder.assignedDriverId && (
                <View style={styles.activeDetailRow}>
                  <Icon name="person" size={16} color={Colors.gray500} />
                  <Text style={styles.activeDetailText}>
                    Driver: {activeOrder.assignedDriverId.firstName} {activeOrder.assignedDriverId.lastName}
                  </Text>
                </View>
              )}
              {activeOrder.estimatedDeliveryMinutes && (
                <View style={styles.activeDetailRow}>
                  <Icon name="access-time" size={16} color={Colors.gray500} />
                  <Text style={styles.activeDetailText}>
                    ETA: {activeOrder.estimatedDeliveryMinutes} mins
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.navigate("Track", { orderId: activeOrder._id })}
            >
              <Icon name="map" size={16} color={Colors.white} />
              <Text style={styles.trackBtnText}>Track on Map</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order) => (
              <View key={order._id} style={styles.recentCard}>
                <View style={styles.recentLeft}>
                  <View style={styles.recentIcon}>
                    <Icon name="local-gas-station" size={18} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.recentFuel}>
                      {order.fuelType.charAt(0).toUpperCase() + order.fuelType.slice(1)} · {order.quantity}L
                    </Text>
                    <Text style={styles.recentAddress} numberOfLines={1}>
                      {order.deliveryLocation.address}
                    </Text>
                    <Text style={styles.recentDate}>
                      {new Date(order.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recentPrice}>Rs. {order.pricing.totalPrice}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gray50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  greeting: { fontSize: 20, fontWeight: "700", color: Colors.black },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  location: { fontSize: 13, color: Colors.gray500, maxWidth: 220 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.white, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },

  // Emergency
  emergencyBtn: {
    backgroundColor: "#DC2626", borderRadius: 20, marginBottom: 24,
    shadowColor: "#DC2626", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  emergencyInner: { padding: 28, alignItems: "center" },
  emergencyTitle: { color: Colors.white, fontSize: 22, fontWeight: "800", marginTop: 12, textAlign: "center" },
  emergencySub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6, textAlign: "center" },

  // Prices
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.black, marginBottom: 12 },
  priceRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  priceCard: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  priceLabel: { fontSize: 13, color: Colors.gray600, marginTop: 6, fontWeight: "600" },
  priceValue: { fontSize: 20, fontWeight: "800", color: Colors.black, marginTop: 2 },
  priceUnit: { fontSize: 11, color: Colors.gray400, marginTop: 2 },

  // Active Order
  activeCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  activeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  activeCardTitle: { fontSize: 15, fontWeight: "700", color: Colors.black },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
  activeBadgeText: { fontSize: 12, fontWeight: "600", color: Colors.primary },

  // Status bar
  statusBar: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  statusStep: { flex: 1, alignItems: "center", position: "relative" },
  statusDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.gray200, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  statusDotActive: { backgroundColor: Colors.primary },
  statusLabel: { fontSize: 10, color: Colors.gray400, textAlign: "center" },
  statusLabelActive: { color: Colors.primary, fontWeight: "600" },
  statusLine: {
    position: "absolute", top: 11, left: "50%", right: "-50%",
    height: 2, backgroundColor: Colors.gray200,
  },
  statusLineActive: { backgroundColor: Colors.primary },

  activeDetails: { gap: 8, marginBottom: 14 },
  activeDetailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeDetailText: { fontSize: 13, color: Colors.gray600 },
  activePricingBox: {
    backgroundColor: Colors.gray50, borderRadius: 10, padding: 10,
    marginVertical: 4, gap: 5,
  },
  activePricingRow: { flexDirection: "row", justifyContent: "space-between" },
  activePricingKey: { fontSize: 12, color: Colors.gray500 },
  activePricingVal: { fontSize: 12, fontWeight: "600", color: Colors.gray700 },
  activePricingTotal: {
    borderTopWidth: 1, borderTopColor: Colors.gray200,
    marginTop: 4, paddingTop: 6,
  },
  activePricingTotalKey: { fontSize: 13, fontWeight: "700", color: Colors.black },
  activePricingTotalVal: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  trackBtn: {
    backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  trackBtnText: { color: Colors.white, fontSize: 14, fontWeight: "700" },

  // Recent
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  recentCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  recentLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  recentIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  recentFuel: { fontSize: 14, fontWeight: "600", color: Colors.black },
  recentAddress: { fontSize: 12, color: Colors.gray500, marginTop: 2, maxWidth: 180 },
  recentDate: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  recentPrice: { fontSize: 14, fontWeight: "700", color: Colors.black },
});
