import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { io, Socket } from "socket.io-client";
import api from "../../api/axios";
import { Colors } from "../../theme/colors";

const SOCKET_URL = "http://192.168.1.77:3000";

interface Location {
  latitude: number;
  longitude: number;
}

interface OrderDetails {
  _id: string;
  status: string;
  deliveryLocation: Location & { address: string };
  assignedDriverId?: {
    _id: string;
    firstName: string;
    lastName: string;
    contactNumber: string;
    location?: Location;
    vehicleInfo?: { vehicleNumber: string; vehicleModel: string };
  };
}

/**
 * Generates the Leaflet HTML for the OSM-based tracking map.
 */
function buildMapHTML(
  order: OrderDetails,
  driverLoc: Location | null,
  polyline: Location[]
): string {
  const custLat = order.deliveryLocation?.latitude ?? 27.7172;
  const custLng = order.deliveryLocation?.longitude ?? 85.3240;
  const address = (order.deliveryLocation?.address || "Delivery Location").replace(/'/g, "\\'");
  
  const driverName = order.assignedDriverId
    ? `${order.assignedDriverId.firstName || ""} ${order.assignedDriverId.lastName || ""}`.trim() || "Driver"
    : "Driver";

  const driverMarkerJS = driverLoc
    ? `
      var driverIcon = L.divIcon({
        className: 'driver-marker',
        html: '<div style="width:36px;height:36px;border-radius:50%;background:#111;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\' fill=\\'white\\' viewBox=\\'0 0 24 24\\'><path d=\\'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zM18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z\\'/></svg></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      var driverMarker = L.marker([${driverLoc.latitude}, ${driverLoc.longitude}], { icon: driverIcon })
        .addTo(map)
        .bindPopup('<b>${driverName.replace(/'/g, "\\'")}</b><br>On the way');
    `
    : "";

  const polylineJS =
    polyline.length > 1
      ? `
      var routeLine = L.polyline([${polyline.map((p) => `[${p.latitude}, ${p.longitude}]`).join(",")}], {
        color: '#10B981',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    `
      : "";

  // Fit bounds
  const allPoints = [
    `[${custLat}, ${custLng}]`,
    ...(driverLoc ? [`[${driverLoc.latitude}, ${driverLoc.longitude}]`] : []),
    ...polyline.map((p) => `[${p.latitude}, ${p.longitude}]`),
  ];
  const fitBoundsJS =
    allPoints.length > 1
      ? `map.fitBounds([${allPoints.join(",")}], { padding: [60, 60], maxZoom: 17 });`
      : `map.setView([${custLat}, ${custLng}], 15);`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      * { margin: 0; padding: 0; }
      html, body, #map { width: 100%; height: 100%; background: #f8fafc; }
      .driver-marker { background: transparent !important; border: none !important; }
      .customer-marker { background: transparent !important; border: none !important; }
      .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map = L.map('map', { zoomControl: false });
      var driverMarker;
      var routeLine;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Customer marker
      var custIcon = L.divIcon({
        className: 'customer-marker',
        html: '<div style="width:28px;height:28px;border-radius:50%;background:rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center"><div style="width:14px;height:14px;border-radius:50%;background:#10B981;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([${custLat}, ${custLng}], { icon: custIcon })
        .addTo(map)
        .bindPopup('<b>Your Location</b><br>${address}');

      ${driverMarkerJS.replace(/var driverMarker =/, "driverMarker =")}
      ${polylineJS.replace(/var routeLine =/, "routeLine =")}
      ${fitBoundsJS}

      // Live update functions
      function updateDriverLocation(lat, lng) {
        if (driverMarker) {
          driverMarker.setLatLng([lat, lng]);
        } else {
          var dIcon = L.divIcon({
            className: 'driver-marker',
            html: '<div style="width:36px;height:36px;border-radius:50%;background:#111;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\' fill=\\'white\\' viewBox=\\'0 0 24 24\\'><path d=\\'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zM18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z\\'/></svg></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          driverMarker = L.marker([lat, lng], { icon: dIcon }).addTo(map);
        }
      }

      function updateRoute(points) {
        if (routeLine) {
          routeLine.setLatLngs(points);
        } else {
          routeLine = L.polyline(points, {
            color: '#10B981',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        }
        if (points.length > 1) {
          map.fitBounds(L.polyline(points).getBounds(), { padding: [60, 60], maxZoom: 17 });
        }
      }
    </script>
  </body>
  </html>`;
}

export default function TrackScreen() {
  const routeParams = useRoute().params as { orderId?: string } | undefined;
  const navigation = useNavigation();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [routePolyline, setRoutePolyline] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const webviewRef = useRef<WebView>(null);
  const socketRef = useRef<Socket | null>(null);

  const orderId = routeParams?.orderId;

  // 1. Load order data
  useEffect(() => {
    if (!orderId) {
      setError("No active order to track");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const orderRes = await api.get(`/orders/${orderId}`);
        const orderData = orderRes.data.data;
        setOrder(orderData);

        if (orderData.assignedDriverId?.location) {
          setDriverLocation(orderData.assignedDriverId.location);
        }

        if (orderData.assignedDriverId?.location) {
          try {
            const routeRes = await api.post("/dispatch/route", {
              driverId: orderData.assignedDriverId._id,
              orderId: orderData._id,
            });
            
            console.log("Route response received:", !!routeRes.data?.data?.route);
            
            const poly = routeRes.data.data.route.polyline.map(
              (p: [number, number]) => ({ latitude: p[1], longitude: p[0] })
            );
            
            console.log("Parsed polyline points:", poly.length);
            setRoutePolyline(poly);
          } catch (err: any) {
            console.log("Route fetch failed:", err.response?.data?.message || err.message);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load tracking data");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // 2. Socket connection
  useEffect(() => {
    if (!orderId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Tracking socket connected:", socket.id);
      socket.emit("joinOrder", orderId);
    });

    socket.on("locationUpdate", (data: any) => {
      if (data.latitude && data.longitude) {
        setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
        // Push update to the WebView map
        webviewRef.current?.injectJavaScript(
          `updateDriverLocation(${data.latitude}, ${data.longitude}); true;`
        );
      }
    });

    socket.on("connect_error", (err) => console.log("Socket error:", err.message));

    return () => {
      socket.emit("leaveOrder", orderId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId]);

  // 3. Update map when polyline changes
  useEffect(() => {
    if (routePolyline.length > 1 && webviewRef.current) {
      console.log("Injecting polyline to map:", routePolyline.length, "points");
      const points = routePolyline.map(p => [p.latitude, p.longitude]);
      
      // Use a small timeout to ensure map is ready to receive JS
      const timer = setTimeout(() => {
        webviewRef.current?.injectJavaScript(
          `if (typeof updateRoute === 'function') { 
            updateRoute(${JSON.stringify(points)}); 
          } true;`
        );
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [routePolyline]);

  const handleCall = useCallback(() => {
    const phone = order?.assignedDriverId?.contactNumber;
    if (phone) Linking.openURL(`tel:${phone}`);
  }, [order]);

  // ── Render States ──

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tracking data…</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Icon name="error-outline" size={60} color={Colors.gray300} />
        <Text style={styles.errorText}>{error || "Something went wrong"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = ["accepted", "in_progress"].includes(order.status);
  const mapHTML = buildMapHTML(order, driverLocation, routePolyline);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub}>#{order._id.slice(-8).toUpperCase()}</Text>
        </View>
      </View>

      {/* OSM Map via WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        />

        {/* Floating Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isActive ? Colors.primary : Colors.gray400 },
              ]}
            />
            <Text style={[styles.statusText, { color: isActive ? Colors.primary : Colors.gray500 }]}>
              {order.status === "pending"
                ? "Waiting for driver…"
                : order.status === "accepted"
                ? "Driver assigned"
                : order.status === "in_progress"
                ? "Fuel is on the way!"
                : "Order " + order.status}
            </Text>
          </View>

          {order.assignedDriverId ? (
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Text style={styles.avatarText}>
                  {order.assignedDriverId.firstName?.[0]?.toUpperCase() ?? "D"}
                </Text>
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {order.assignedDriverId.firstName} {order.assignedDriverId.lastName}
                </Text>
                <Text style={styles.vehicleInfo}>
                  {order.assignedDriverId.vehicleInfo?.vehicleModel} ·{" "}
                  {order.assignedDriverId.vehicleInfo?.vehicleNumber}
                </Text>
              </View>
              <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                <Icon name="call" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              We're assigning the nearest available driver to you.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.black },
  headerSub: { fontSize: 12, color: Colors.gray500, marginTop: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#DC2626" },
  liveText: { fontSize: 11, fontWeight: "800", color: "#DC2626", letterSpacing: 0.5 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { marginTop: 12, color: Colors.gray500, fontSize: 14 },
  errorText: { marginTop: 16, color: Colors.gray600, fontSize: 16, textAlign: "center" },
  retryBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: Colors.white, fontWeight: "600" },

  infoCard: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: "600" },

  driverInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: Colors.primary },
  driverDetails: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: "700", color: Colors.black },
  vehicleInfo: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, color: Colors.gray500, lineHeight: 20 },
});
