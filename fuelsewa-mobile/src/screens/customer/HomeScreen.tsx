import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
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
const CUSTOMER_TYPES = ["driver_assigned", "in_progress", "delivered", "cancelled"];

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
  const allNotifications = useNotificationStore((s) => s.notifications);
  const unreadCount = allNotifications.filter(
    (n) => !n.read && (CUSTOMER_TYPES.includes(n.type) || n.type === "info")
  ).length;

  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationAddress, setLocationAddress] = useState("Detecting location...");

  const detectLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationAddress("Location access denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode && geocode.length > 0) {
        const item = geocode[0];
        const street = item.street || item.district || item.name || "";
        const city = item.city || "Kathmandu";
        setLocationAddress(street ? `${street}, ${city}` : city);
      } else {
        setLocationAddress("Kathmandu, Nepal");
      }
    } catch {
      setLocationAddress("Kathmandu, Nepal");
    }
  }, []);

  const fetchData = useCallback(async () => {
    setError(null);
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
    } catch {
      setError("Failed to load data. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); detectLocation(); }, [fetchData, detectLocation]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleEmergency = () => {
    navigation.navigate("RequestFuel");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
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
              <Text style={styles.location} numberOfLines={1}>{locationAddress}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate("Notifications")}>
            <Icon name="notifications-none" size={24} color={Colors.gray700} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Icon name="info-outline" size={16} color="#D97706" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Order Fuel CTA */}
        <TouchableOpacity style={styles.orderCta} onPress={handleEmergency} activeOpacity={0.85}>
          <View style={styles.orderCtaIcon}>
            <Icon name="local-gas-station" size={28} color={Colors.primary} />
          </View>
          <View style={styles.orderCtaText}>
            <Text style={styles.orderCtaTitle}>Need Fuel?</Text>
            <Text style={styles.orderCtaSub}>Order now and get it delivered to your doorstep</Text>
          </View>
          <Icon name="arrow-forward-ios" size={16} color={Colors.gray400} />
        </TouchableOpacity>

        {/* Emergency Button */}
        <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergency} activeOpacity={0.85}>
          <View style={styles.emergencyInner}>
            <Icon name="warning" size={32} color={Colors.white} />
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

        {/* Active Order - Ride-sharing style */}
        {activeOrder && (
          <View style={styles.activeCard}>
            <View style={styles.activeCardHeader}>
              <View style={styles.activeTitleRow}>
                <View style={styles.activePulse} />
                <Text style={styles.activeCardTitle}>Active Order</Text>
              </View>
              <View style={styles.activePriceTag}>
                <Text style={styles.activePriceTagText}>Rs. {activeOrder.pricing.totalPrice}</Text>
              </View>
            </View>

            <OrderStatusBar status={activeOrder.status} />

            <View style={styles.activeContent}>
              <View style={styles.activeFuelRow}>
                <View style={styles.activeFuelBadge}>
                  <Icon name="local-gas-station" size={16} color={Colors.white} />
                </View>
                <View style={styles.activeFuelInfo}>
                  <Text style={styles.activeFuelType}>
                    {activeOrder.fuelType.charAt(0).toUpperCase() + activeOrder.fuelType.slice(1)}
                  </Text>
                  <Text style={styles.activeFuelQty}>{activeOrder.quantity} Liters</Text>
                </View>
                <View style={styles.activeStatusTag}>
                  <Text style={styles.activeStatusTagText}>
                    {activeOrder.status === "pending" ? "Pending" :
                     activeOrder.status === "accepted" ? "Accepted" :
                     activeOrder.status === "in_progress" ? "On the way" : activeOrder.status}
                  </Text>
                </View>
              </View>

              <View style={styles.activeDivider} />

              {activeOrder.assignedDriverId && (
                <View style={styles.activeDriverRow}>
                  <View style={styles.activeDriverAvatar}>
                    <Text style={styles.activeDriverAvatarText}>
                      {activeOrder.assignedDriverId.firstName[0]?.toUpperCase() ?? "D"}
                    </Text>
                  </View>
                  <View style={styles.activeDriverInfo}>
                    <Text style={styles.activeDriverName}>
                      {activeOrder.assignedDriverId.firstName} {activeOrder.assignedDriverId.lastName}
                    </Text>
                    <Text style={styles.activeDriverLabel}>Your driver</Text>
                  </View>
                  {activeOrder.estimatedDeliveryMinutes && (
                    <View style={styles.activeEta}>
                      <Icon name="access-time" size={14} color={Colors.primary} />
                      <Text style={styles.activeEtaText}>{activeOrder.estimatedDeliveryMinutes} min</Text>
                    </View>
                  )}
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
              <TouchableOpacity
                key={order._id}
                style={styles.recentCard}
                onPress={() => navigation.navigate("RequestFuel")}
                activeOpacity={0.7}
              >
                <View style={styles.recentLeft}>
                  <View style={styles.recentIcon}>
                    <Icon name="local-gas-station" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
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
                <View style={styles.recentRight}>
                  <Text style={styles.recentPrice}>Rs. {order.pricing.totalPrice}</Text>
                  <View style={styles.reorderBtn}>
                    <Text style={styles.reorderBtnText}>Reorder</Text>
                  </View>
                </View>
              </TouchableOpacity>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: "700", color: Colors.black },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  location: { fontSize: 13, color: Colors.gray500, maxWidth: 220 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, position: "relative" },
  bellBadge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, fontWeight: "800", color: Colors.white },

  // Error Banner
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#FDE68A" },
  errorBannerText: { flex: 1, fontSize: 13, color: "#D97706", fontWeight: "500" },

  // Order CTA
  orderCta: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, gap: 14 },
  orderCtaIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  orderCtaText: { flex: 1 },
  orderCtaTitle: { fontSize: 16, fontWeight: "700", color: Colors.black },
  orderCtaSub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },

  // Emergency
  emergencyBtn: { backgroundColor: "#DC2626", borderRadius: 20, marginBottom: 24, shadowColor: "#DC2626", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  emergencyInner: { padding: 28, alignItems: "center" },
  emergencyTitle: { color: Colors.white, fontSize: 22, fontWeight: "800", marginTop: 12, textAlign: "center" },
  emergencySub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6, textAlign: "center" },

  // Prices
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.black, marginBottom: 12 },
  priceRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  priceCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  priceLabel: { fontSize: 13, color: Colors.gray600, marginTop: 6, fontWeight: "600" },
  priceValue: { fontSize: 20, fontWeight: "800", color: Colors.black, marginTop: 2 },
  priceUnit: { fontSize: 11, color: Colors.gray400, marginTop: 2 },

  // Active Order - Ride-sharing style
  activeCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 0, marginBottom: 24, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  activeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 12 },
  activeTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  activeCardTitle: { fontSize: 16, fontWeight: "700", color: Colors.black },
  activePriceTag: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activePriceTagText: { fontSize: 13, fontWeight: "700", color: Colors.primary },

  // Status bar
  statusBar: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 12 },
  statusStep: { flex: 1, alignItems: "center", position: "relative" },
  statusDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.gray200, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statusDotActive: { backgroundColor: Colors.primary },
  statusLabel: { fontSize: 10, color: Colors.gray400, textAlign: "center" },
  statusLabelActive: { color: Colors.primary, fontWeight: "600" },
  statusLine: { position: "absolute", top: 11, left: "50%", right: "-50%", height: 2, backgroundColor: Colors.gray200 },
  statusLineActive: { backgroundColor: Colors.primary },

  activeContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  activeFuelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeFuelBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  activeFuelInfo: { flex: 1 },
  activeFuelType: { fontSize: 15, fontWeight: "700", color: Colors.black },
  activeFuelQty: { fontSize: 12, color: Colors.gray500, marginTop: 1 },
  activeStatusTag: { backgroundColor: Colors.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeStatusTagText: { fontSize: 11, fontWeight: "600", color: Colors.gray600, textTransform: "capitalize" },
  activeDivider: { height: 1, backgroundColor: Colors.gray100 },
  activeDriverRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  activeDriverAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  activeDriverAvatarText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  activeDriverInfo: { flex: 1 },
  activeDriverName: { fontSize: 13, fontWeight: "600", color: Colors.black },
  activeDriverLabel: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  activeEta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  activeEtaText: { fontSize: 11, fontWeight: "700", color: Colors.primary },

  trackBtn: { backgroundColor: Colors.primary, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  trackBtnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },

  // Recent
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  recentCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  recentLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  recentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  recentFuel: { fontSize: 14, fontWeight: "600", color: Colors.black },
  recentAddress: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  recentDate: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  recentRight: { alignItems: "flex-end", gap: 6, marginLeft: 8 },
  recentPrice: { fontSize: 14, fontWeight: "700", color: Colors.black },
  reorderBtn: { backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  reorderBtnText: { fontSize: 11, fontWeight: "700", color: Colors.primary },
});
