import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import api from "../../api/axios";
import { useAuthStore } from "../../store/authStore";

interface CustomerInfo {
  name: string;
  rating: string;
  reviewsCount: number;
  duration: string;
  avatar: string | null;
}

interface Order {
  _id: string;
  orderId?: string;
  customer: CustomerInfo;
  distanceKm: number | null;
  fuelType: string;
  quantity?: number;
  deliveryLocation: {
    address: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  };
  isEmergency: boolean;
  status: string;
  pricing?: {
    totalPrice?: number;
    subtotal?: number;
  };
}

const MOCK_ORDERS: Order[] = [
  {
    _id: "mock-1",
    customer: {
      name: "asha",
      rating: "4.8",
      reviewsCount: 0,
      duration: "3 min.",
      avatar: null,
    },
    distanceKm: 3.2,
    fuelType: "diesel",
    quantity: 25,
    deliveryLocation: {
      address: "SN Home (Kathmandu, Bagmati Province)",
      landmark: "Matatirtha Temple (Kathmandu, Bagmati Province)",
      latitude: 27.6912,
      longitude: 85.2812,
    },
    isEmergency: true,
    status: "accepted",
    pricing: {
      totalPrice: 100,
    },
  },
  {
    _id: "mock-2",
    customer: {
      name: "sabin",
      rating: "4.83",
      reviewsCount: 39,
      duration: "1 min.",
      avatar: null,
    },
    distanceKm: 2.1,
    fuelType: "petrol",
    quantity: 15,
    deliveryLocation: {
      address: "Jenisa Home (Kathmandu, Bagmati Province)",
      landmark: "Bright Horizon (Kathmandu, Bagmati Province)",
      latitude: 27.6990,
      longitude: 85.2910,
    },
    isEmergency: false,
    status: "accepted",
    pricing: {
      totalPrice: 200,
    },
  },
  {
    _id: "mock-3",
    customer: {
      name: "Priza",
      rating: "4.59",
      reviewsCount: 108,
      duration: "10 min.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    },
    distanceKm: 2.9,
    fuelType: "petrol",
    quantity: 20,
    deliveryLocation: {
      address: "NEWA SADAN (Kathmandu, Bagmati Province)",
      landmark: "Vayodha Hospitals (Kathmandu, Bagmati Province)",
      latitude: 27.6850,
      longitude: 85.3120,
    },
    isEmergency: false,
    status: "in_progress",
    pricing: {
      totalPrice: 150,
    },
  },
];

// OpenStreetMap standard colorful tile style
function buildColorfulMapHTML(
  driverLat: number,
  driverLon: number,
  custLat: number,
  custLon: number,
  routePointsJson: string
): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      * { margin: 0; padding: 0; }
      html, body, #map { width: 100%; height: 100%; background: #ffffff; }
      .custom-label-blue {
        background: #3B82F6;
        color: white;
        padding: 5px 10px;
        border-radius: 6px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        border: 1.5px solid white;
      }
      .custom-label-green {
        background: #BEF264;
        color: #121212;
        padding: 5px 10px;
        border-radius: 6px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        border: 1.5px solid #121212;
      }
      .marker-a {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #3B82F6;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
      .marker-b {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #10B981;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map = L.map('map', { zoomControl: false });
      
      // Colorful OpenStreetMap bright layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      var driverLat = ${driverLat};
      var driverLon = ${driverLon};
      var custLat = ${custLat};
      var custLon = ${custLon};
      var routePoints = ${routePointsJson};

      // Point A marker (Blue)
      var iconA = L.divIcon({
        className: 'custom-icon-a',
        html: '<div class="marker-a">A</div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      L.marker([driverLat, driverLon], { icon: iconA }).addTo(map);

      // Point B marker (Green)
      var iconB = L.divIcon({
        className: 'custom-icon-b',
        html: '<div class="marker-b">B</div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      L.marker([custLat, custLon], { icon: iconB }).addTo(map);

      // exact road route polyline
      if (routePoints && routePoints.length > 1) {
        L.polyline(routePoints, {
          color: '#3B82F6',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      } else {
        // Fallback straight line
        L.polyline([[driverLat, driverLon], [custLat, custLon]], {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.7,
          dashArray: '6, 6'
        }).addTo(map);
      }

      // Floating labels exactly as screenshot
      var labelA = L.divIcon({
        className: 'custom-label-blue',
        html: '12 min<br>3,2 km',
        iconSize: [70, 36],
        iconAnchor: [35, 46]
      });
      L.marker([driverLat + 0.0003, driverLon + 0.0003], { icon: labelA }).addTo(map);

      var labelB = L.divIcon({
        className: 'custom-label-green',
        html: '11 min<br>3,6 km',
        iconSize: [70, 36],
        iconAnchor: [35, 46]
      });
      L.marker([custLat + 0.0003, custLon - 0.0003], { icon: labelB }).addTo(map);

      var boundsPoints = routePoints && routePoints.length > 0 ? routePoints : [[driverLat, driverLon], [custLat, custLon]];
      map.fitBounds(boundsPoints, { padding: [50, 50] });
    </script>
  </body>
  </html>`;
}

export default function DriverOrdersScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Map route configurations
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  const getStableCustomerMeta = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rating = (4.3 + (Math.abs(hash) % 7) * 0.1).toFixed(2);
    const reviews = Math.abs(hash) % 150;
    const minutes = (Math.abs(hash) % 12) + 1;
    return {
      rating,
      reviewsCount: reviews,
      duration: `${minutes} min.`,
    };
  };

  const fetchOrders = useCallback(async () => {
    try {
      let lat = null;
      let lon = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
          setDriverCoords({ latitude: lat, longitude: lon });
        }
      } catch (err) {
        console.warn("Location check error: ", err);
      }

      const url = lat && lon ? `/driver/orders?lat=${lat}&lon=${lon}` : "/driver/orders";
      const res = await api.get(url);
      const data = res.data?.data;

      if (Array.isArray(data) && data.length > 0) {
        const formattedOrders = data.map((item: any) => {
          const meta = getStableCustomerMeta(item.orderId || item._id);
          return {
            _id: item.orderId || item._id,
            customer: {
              name: item.customer?.name || "Customer",
              rating: meta.rating,
              reviewsCount: meta.reviewsCount,
              duration: meta.duration,
              avatar: item.customer?.profilePhoto || null,
            },
            distanceKm: item.distanceKm,
            fuelType: item.fuelType || "petrol",
            quantity: item.quantity,
            deliveryLocation: {
              address: item.deliveryLocation?.address || "Address",
              landmark: item.deliveryLocation?.landmark || "",
              latitude: item.deliveryLocation?.latitude,
              longitude: item.deliveryLocation?.longitude,
            },
            isEmergency: item.isEmergency || false,
            status: item.status || "accepted",
            pricing: item.pricing || { totalPrice: item.quantity ? item.quantity * 125 : 100 },
          };
        });
        setOrders(formattedOrders);
      } else {
        setOrders(MOCK_ORDERS);
      }
    } catch (err) {
      console.warn("API error: ", err);
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Intermediate curved road coordinates mock so curved roads are shown instead of straight polylines
  const generateMockRoadPoints = (lat1: number, lon1: number, lat2: number, lon2: number): [number, number][] => {
    const stepLat = (lat2 - lat1) / 3;
    const stepLon = (lon2 - lon1) / 3;
    return [
      [lat1, lon1],
      [lat1 + stepLat + 0.0012, lon1 + stepLon - 0.0008],
      [lat1 + stepLat * 2 - 0.0006, lon1 + stepLon * 2 + 0.0014],
      [lat2, lon2]
    ];
  };

  const handleOpenDetail = async (order: Order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
    setRoutePoints([]); // Clear previous

    let currentLat = 27.6912;
    let currentLon = 85.3012;

    // Get current position
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      currentLat = loc.coords.latitude;
      currentLon = loc.coords.longitude;
      setDriverCoords({ latitude: currentLat, longitude: currentLon });
    } catch (err) {
      if (driverCoords) {
        currentLat = driverCoords.latitude;
        currentLon = driverCoords.longitude;
      } else {
        setDriverCoords({ latitude: currentLat, longitude: currentLon });
      }
    }

    const destLat = order.deliveryLocation?.latitude ?? 27.6990;
    const destLon = order.deliveryLocation?.longitude ?? 85.2910;

    // Call route planner if it is a real order, else generate mock curved street road
    if (order._id.startsWith("mock-") || !user?.id) {
      const mockPoints = generateMockRoadPoints(currentLat, currentLon, destLat, destLon);
      setRoutePoints(mockPoints);
    } else {
      try {
        const routeRes = await api.post("/dispatch/route", {
          driverId: user.id,
          orderId: order._id,
        });
        const realRoute = routeRes.data?.data?.route?.polyline;
        if (Array.isArray(realRoute) && realRoute.length > 0) {
          // polyline is [lon, lat], map directly to [lat, lon] for Leaflet
          const poly: [number, number][] = realRoute.map((p: [number, number]) => [p[1], p[0]]);
          setRoutePoints(poly);
        } else {
          // Fallback curved
          const fallbackPoints = generateMockRoadPoints(currentLat, currentLon, destLat, destLon);
          setRoutePoints(fallbackPoints);
        }
      } catch (err) {
        console.log("Real road routing failed, loading fallback curves:", err);
        const fallbackPoints = generateMockRoadPoints(currentLat, currentLon, destLat, destLon);
        setRoutePoints(fallbackPoints);
      }
    }
  };

  const handleUpdateStatus = async (status: "in_progress" | "delivered") => {
    if (!selectedOrder) return;
    
    if (selectedOrder._id.startsWith("mock-")) {
      setOrders((prev) =>
        prev.map((o) => (o._id === selectedOrder._id ? { ...o, status } : o))
      );
      setDetailModalVisible(false);
      Alert.alert("Success", `Status updated to ${status === "in_progress" ? "On the Way" : "Delivered"}`);
      return;
    }

    setUpdating(true);
    try {
      await api.patch(`/driver/orders/${selectedOrder._id}/status`, { status });
      setDetailModalVisible(false);
      Alert.alert("Success", `Order marked as ${status === "in_progress" ? "On the Way" : "Delivered"}`);
      fetchOrders();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const formattedDistance = item.distanceKm !== null 
      ? `~${item.distanceKm.toFixed(1).replace(".", ",")} km`
      : "~2,5 km";

    const customerFirstName = item.customer.name.split(" ")[0].toLowerCase();

    return (
      <TouchableOpacity 
        style={styles.cardContainer} 
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.8}
      >
        {/* Left Profile Column */}
        <View style={styles.leftColumn}>
          {item.customer.avatar ? (
            <Image source={{ uri: item.customer.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={26} color="#A3A3A3" />
            </View>
          )}
          
          <Text style={styles.customerName} numberOfLines={1}>
            {customerFirstName}
          </Text>
          
          <View style={styles.ratingRow}>
            <Icon name="star" size={10} color="#FBBF24" style={styles.starIcon} />
            <Text style={styles.ratingText}>{item.customer.rating}</Text>
          </View>
          
          <Text style={styles.reviewsText}>
            ({item.customer.reviewsCount})
          </Text>
          
          <Text style={styles.durationText}>
            {item.customer.duration}
          </Text>
        </View>

        {/* Center Details Column */}
        <View style={styles.centerColumn}>
          <Text style={styles.distanceText}>{formattedDistance}</Text>

          <View style={styles.fuelTitleContainer}>
            <Text style={styles.fuelTypeTitle}>
              {item.fuelType.toUpperCase()}
            </Text>
            
            {item.isEmergency && (
              <View style={styles.purpleBadge}>
                <Icon name="adjust" size={12} color="#D688FF" />
                <Text style={styles.purpleBadgeText}>Priority</Text>
              </View>
            )}
          </View>

          <Text style={styles.addressText} numberOfLines={2}>
            {item.deliveryLocation.address}
          </Text>

          <Text style={styles.landmarkText} numberOfLines={2}>
            {item.deliveryLocation.landmark || "FuelSewa Depot (Kathmandu)"}
          </Text>
        </View>

        {/* Right Arrow */}
        <View style={styles.rightColumn}>
          <Icon name="arrow-forward-ios" size={18} color="#4B5563" />
        </View>
      </TouchableOpacity>
    );
  };

  const getMapHTML = () => {
    if (!selectedOrder) return "";
    const driverLat = driverCoords?.latitude ?? 27.6912;
    const driverLon = driverCoords?.longitude ?? 85.3012;
    const custLat = selectedOrder.deliveryLocation?.latitude ?? 27.6990;
    const custLon = selectedOrder.deliveryLocation?.longitude ?? 85.2910;
    return buildColorfulMapHTML(driverLat, driverLon, custLat, custLon, JSON.stringify(routePoints));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assigned Shipments</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1D9E75" />
          <Text style={styles.loaderText}>Fetching shipments...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              tintColor="#1D9E75" 
              colors={["#1D9E75"]} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="local-shipping" size={60} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Assigned Shipments</Text>
              <Text style={styles.emptySub}>You have no orders assigned by dispatch yet.</Text>
            </View>
          }
        />
      )}

      {/* Ride-Sharing Style Order Details Full Screen Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalFullContainer}>
          {/* Header Bar */}
          <SafeAreaView style={styles.modalHeader} edges={["top"]}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.modalCloseIconBtn}>
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Order Details</Text>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Leaflet Map Section taking up map area */}
          {selectedOrder && (
            <View style={styles.leafletContainer}>
              <WebView
                source={{ html: getMapHTML() }}
                style={styles.webViewMap}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Ride-Share Dark Bottom Sheet Overlay */}
          {selectedOrder && (
            <View style={styles.rideSheet}>
              <View style={styles.sheetRow}>
                {/* Left Profile details */}
                <View style={styles.sheetLeftColumn}>
                  {selectedOrder.customer.avatar ? (
                    <Image source={{ uri: selectedOrder.customer.avatar }} style={styles.sheetAvatar} />
                  ) : (
                    <View style={styles.sheetAvatarPlaceholder}>
                      <Icon name="account-circle" size={46} color="#7C7C80" />
                    </View>
                  )}
                  <Text style={styles.sheetCustomerName}>{selectedOrder.customer.name.toLowerCase()}</Text>
                  
                  <View style={styles.sheetRatingRow}>
                    <Icon name="star" size={12} color="#FBBF24" />
                    <Text style={styles.sheetRatingText}>{selectedOrder.customer.rating}</Text>
                    <Text style={styles.sheetReviewsText}> ({selectedOrder.customer.reviewsCount})</Text>
                  </View>
                  <Text style={styles.sheetDurationText}>{selectedOrder.customer.duration}</Text>
                </View>

                {/* Right Details Overlay */}
                <View style={styles.sheetRightColumn}>
                  <Text style={styles.sheetDistanceText}>
                    ~{selectedOrder.distanceKm?.toFixed(1).replace(".", ",")} km
                  </Text>

                  {/* Price and priority indicator */}
                  <View style={styles.sheetPriceRow}>
                    <Text style={styles.sheetPriceText}>
                      NPR{selectedOrder.pricing?.totalPrice || selectedOrder.quantity ? (selectedOrder.quantity || 0) * 125 : 100}
                    </Text>
                    <View style={styles.sheetPriorityBadge}>
                      <Icon name="adjust" size={10} color="#D688FF" />
                      <Text style={styles.sheetPriorityBadgeText}>
                        {selectedOrder.isEmergency ? "Priority" : "Fair price"}
                      </Text>
                    </View>
                  </View>

                  {/* Address steps */}
                  <View style={styles.addressStepContainer}>
                    {/* Step A */}
                    <View style={styles.stepRow}>
                      <View style={styles.circleA}>
                        <Text style={styles.stepCircleText}>A</Text>
                      </View>
                      <Text style={styles.stepAddressText} numberOfLines={2}>
                        {selectedOrder.deliveryLocation.landmark || "FuelSewa Depot (Kathmandu)"}
                      </Text>
                    </View>
                    
                    {/* Line connecting A to B */}
                    <View style={styles.dashedConnector} />

                    {/* Step B */}
                    <View style={styles.stepRow}>
                      <View style={styles.circleB}>
                        <Text style={styles.stepCircleText}>B</Text>
                      </View>
                      <Text style={styles.stepAddressText} numberOfLines={2}>
                        {selectedOrder.deliveryLocation.address}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons exactly matching ride-sharing spec */}
              <View style={styles.sheetActionsContainer}>
                {selectedOrder.status === "accepted" && (
                  <TouchableOpacity
                    style={styles.rideAcceptBtn}
                    onPress={() => handleUpdateStatus("in_progress")}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#121212" />
                    ) : (
                      <Text style={styles.rideAcceptBtnText}>Start Dispatch (On the Way)</Text>
                    )}
                  </TouchableOpacity>
                )}

                {selectedOrder.status === "in_progress" && (
                  <TouchableOpacity
                    style={styles.rideAcceptBtn}
                    onPress={() => handleUpdateStatus("delivered")}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#121212" />
                    ) : (
                      <Text style={styles.rideAcceptBtnText}>Arrived & Complete Delivery</Text>
                    )}
                  </TouchableOpacity>
                )}

                {selectedOrder.status === "delivered" && (
                  <View style={styles.deliveredLabelBox}>
                    <Icon name="check-circle" size={20} color="#BEF264" />
                    <Text style={styles.deliveredLabelText}>DELIVERED SUCCESSFULLY</Text>
                  </View>
                )}

                {/* Dark Gray Close Button */}
                <TouchableOpacity
                  style={styles.rideCloseBtn}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.rideCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    backgroundColor: "#1A1A1A",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  listContainer: {
    backgroundColor: "#121212",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 14,
  },
  cardContainer: {
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
    backgroundColor: "#151515",
  },
  leftColumn: {
    width: 70,
    alignItems: "center",
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#3A3A3A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginBottom: 4,
  },
  customerName: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
    textAlign: "center",
    width: "100%",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    color: "#FBBF24",
    fontSize: 10,
    fontWeight: "700",
  },
  reviewsText: {
    color: "#9CA3AF",
    fontSize: 9,
    marginBottom: 3,
  },
  durationText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "500",
  },
  centerColumn: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 6,
  },
  distanceText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  fuelTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  fuelTypeTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  purpleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(214, 136, 255, 0.15)",
    borderColor: "rgba(214, 136, 255, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
  },
  purpleBadgeText: {
    color: "#D688FF",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },
  addressText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 4,
  },
  landmarkText: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 18,
  },
  rightColumn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E5E7EB",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  modalFullContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  modalCloseIconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  leafletContainer: {
    flex: 1,
    backgroundColor: "#151515",
  },
  webViewMap: {
    flex: 1,
    backgroundColor: "#121212",
  },
  rideSheet: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderTopColor: "#2C2C2E",
  },
  sheetRow: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 16,
  },
  sheetLeftColumn: {
    width: 80,
    alignItems: "center",
  },
  sheetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  sheetAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  sheetCustomerName: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  sheetRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sheetRatingText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 2,
  },
  sheetReviewsText: {
    color: "#9CA3AF",
    fontSize: 10,
  },
  sheetDurationText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
  },
  sheetRightColumn: {
    flex: 1,
  },
  sheetDistanceText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  sheetPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sheetPriceText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sheetPriorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(214, 136, 255, 0.15)",
    borderColor: "rgba(214, 136, 255, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sheetPriorityBadgeText: {
    color: "#D688FF",
    fontSize: 10,
    fontWeight: "700",
  },
  addressStepContainer: {
    position: "relative",
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleA: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  circleB: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  stepAddressText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  dashedConnector: {
    width: 1.5,
    height: 18,
    backgroundColor: "#374151",
    marginLeft: 9,
    marginVertical: 4,
  },
  sheetActionsContainer: {
    gap: 12,
  },
  rideAcceptBtn: {
    backgroundColor: "#BEF264",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  rideAcceptBtnText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  deliveredLabelBox: {
    backgroundColor: "rgba(190, 242, 100, 0.15)",
    borderWidth: 1,
    borderColor: "#BEF264",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deliveredLabelText: {
    color: "#BEF264",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  rideCloseBtn: {
    backgroundColor: "#2C2C2E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rideCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
