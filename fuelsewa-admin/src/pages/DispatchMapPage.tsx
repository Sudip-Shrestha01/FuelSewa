import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTruck, faRoute, faGasPump,
  faClock, faRoad, faBolt, faUserCheck, faSpinner,
  faChevronRight, faMapLocationDot, faCircleCheck,
  faTriangleExclamation, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";

// ─── Types ──────────────────────────────────────────────────────────

interface DriverLocation {
  _id: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  vehicleInfo: { vehicleNumber: string; vehicleType: string; vehicleModel: string };
  location: { latitude: number; longitude: number };
}

interface Order {
  _id: string;
  fuelType: string;
  quantity: number;
  status: string;
  isEmergency: boolean;
  priority: string;
  deliveryLocation: { latitude: number; longitude: number; address: string; landmark?: string };
  userId: { firstName: string; lastName: string; phone: string } | null;
  assignedDriverId: any;
  pricing: { totalPrice: number };
  createdAt: string;
}

interface RankedDriver {
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  contactNumber: string;
  estimatedDistanceKm: number;
  estimatedCost: number;
  heuristicScore: number;
  rank: number;
}

interface RouteData {
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][];
}

// ─── Custom Map Icons ───────────────────────────────────────────────

const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: white; font-weight: bold;
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

const orderIcon = createIcon("#F59E0B", "📍"); // Amber for Pending
const orderEmergencyIcon = createIcon("#EF4444", "🆘"); // Red for SOS
const driverIcon = createIcon("#10B981", "🚛");
const selectedDriverIcon = createIcon("#3B82F6", "✓");

// ─── Map Fitter ─────────────────────────────────────────────────────

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

// ─── Main Component ─────────────────────────────────────────────────

export default function DispatchMapPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rankedDrivers, setRankedDrivers] = useState<RankedDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<RankedDriver | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [findingDrivers, setFindingDrivers] = useState(false);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Nepal center
  const defaultCenter: [number, number] = [27.7172, 85.3240];

  // ─── Data Fetching ────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, driversRes] = await Promise.all([
        api.get("/admin/orders?status=pending"),
        api.get("/dispatch/drivers-locations"),
      ]);
      setOrders(ordersRes.data.data || []);
      setDrivers(driversRes.data.data || []);
    } catch (e: any) {
      setErrorMsg("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fit map to all markers
  useEffect(() => {
    const pts: [number, number][] = [];
    orders.forEach((o) => {
      if (o.deliveryLocation?.latitude && o.deliveryLocation?.longitude) {
        pts.push([o.deliveryLocation.latitude, o.deliveryLocation.longitude]);
      }
    });
    drivers.forEach((d) => {
      if (d.location?.latitude && d.location?.longitude) {
        pts.push([d.location.latitude, d.location.longitude]);
      }
    });
    if (pts.length > 0) {
      setBounds(L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1]))));
    }
  }, [orders, drivers]);

  // ─── A* Driver Ranking ────────────────────────────────────────────

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order);
    setSelectedDriver(null);
    setRouteData(null);
    setRoutePolyline([]);
    setRankedDrivers([]);
    setSuccessMsg("");
    setErrorMsg("");
    setFindingDrivers(true);

    try {
      const res = await api.post("/dispatch/find-drivers", {
        orderId: order._id,
      });
      setRankedDrivers(res.data.data.rankedDrivers || []);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || "Failed to find drivers");
    } finally {
      setFindingDrivers(false);
    }
  };

  // ─── ORS Route Preview ───────────────────────────────────────────

  const handlePreviewRoute = async (driver: RankedDriver) => {
    if (!selectedOrder) return;
    setSelectedDriver(driver);
    setFetchingRoute(true);
    setRouteData(null);
    setRoutePolyline([]);

    try {
      const res = await api.post("/dispatch/route", {
        driverId: driver.driverId,
        orderId: selectedOrder._id,
      });

      const route = res.data.data.route;
      setRouteData(route);

      // Convert ORS polyline [lng, lat] → [lat, lng] for Leaflet
      const leafletPoly: [number, number][] = route.polyline.map(
        (coord: [number, number]) => [coord[1], coord[0]]
      );
      setRoutePolyline(leafletPoly);

      // Fit map to route
      if (leafletPoly.length > 0) {
        setBounds(
          L.latLngBounds(leafletPoly.map((p) => L.latLng(p[0], p[1])))
        );
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || "Failed to fetch route");
    } finally {
      setFetchingRoute(false);
    }
  };

  // ─── Assign Driver ───────────────────────────────────────────────

  const handleAssign = async () => {
    if (!selectedOrder || !selectedDriver) return;
    setAssigning(true);
    setErrorMsg("");

    try {
      await api.post("/dispatch/assign", {
        orderId: selectedOrder._id,
        driverId: selectedDriver.driverId,
        estimatedDeliveryMinutes: routeData?.durationMinutes
          ? Math.ceil(routeData.durationMinutes)
          : undefined,
      });

      setSuccessMsg(
        `${selectedDriver.driverName} assigned to order #${selectedOrder._id.slice(-6).toUpperCase()}`
      );
      setSelectedOrder(null);
      setRankedDrivers([]);
      setSelectedDriver(null);
      setRouteData(null);
      setRoutePolyline([]);

      // Refresh data
      await fetchData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || "Failed to assign driver");
    } finally {
      setAssigning(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────

  const handleReset = () => {
    setSelectedOrder(null);
    setRankedDrivers([]);
    setSelectedDriver(null);
    setRouteData(null);
    setRoutePolyline([]);
    setSuccessMsg("");
    setErrorMsg("");
  };

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin-slow mx-auto mb-3" />
          <p className="text-sm text-surface-500">Loading dispatch map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 flex items-center gap-2.5">
            <FontAwesomeIcon icon={faMapLocationDot} className="text-primary-500" />
            Dispatch Map
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-soft" />
            <span className="text-xs font-medium text-amber-700">
              {orders.length} pending
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">
              {drivers.length} drivers online
            </span>
          </div>
        </div>
      </div>

      {/* Toast Messages */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in-down">
          <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800 flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-600">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl animate-fade-in-down">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-600" />
          <p className="text-sm font-medium text-red-800 flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {/* Main Layout: Map + Panel */}
      <div className="flex gap-5 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-surface-200 shadow-card bg-white">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />

            {/* Order Markers */}
            {orders.filter(o => o.deliveryLocation?.latitude && o.deliveryLocation?.longitude).map((order) => (
              <Marker
                key={order._id}
                position={[order.deliveryLocation.latitude, order.deliveryLocation.longitude]}
                icon={order.isEmergency ? orderEmergencyIcon : orderIcon}
                eventHandlers={{
                  click: () => handleSelectOrder(order),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[160px]">
                    <p className="font-bold text-surface-900">
                      #{order._id.slice(-6).toUpperCase()}
                      {order.isEmergency && <span className="ml-1 text-red-600">🆘</span>}
                    </p>
                    <p className="text-surface-600">{order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : "—"}</p>
                    <p className="text-surface-500 capitalize">{order.fuelType} · {order.quantity}L</p>
                    <p className="font-semibold text-surface-800">Rs. {order.pricing.totalPrice}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Driver Markers */}
            {drivers.filter(d => d.location?.latitude && d.location?.longitude).map((driver) => (
              <Marker
                key={driver._id}
                position={[driver.location.latitude, driver.location.longitude]}
                icon={
                  selectedDriver?.driverId === driver._id
                    ? selectedDriverIcon
                    : driverIcon
                }
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[140px]">
                    <p className="font-bold text-surface-900">
                      {driver.firstName} {driver.lastName}
                    </p>
                    <p className="text-surface-600">{driver.vehicleInfo.vehicleNumber}</p>
                    <p className="text-surface-500">{driver.contactNumber}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route Polyline */}
            {routePolyline.length > 0 && (
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: "#3B82F6",
                  weight: 5,
                  opacity: 0.8,
                  dashArray: "10, 6",
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Side Panel */}
        <div
          ref={panelRef}
          className="w-[380px] shrink-0 bg-white border border-surface-200 rounded-xl shadow-card overflow-y-auto"
        >
          {!selectedOrder ? (
            /* Order List */
            <div>
              <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-surface-100">
                <h2 className="font-bold text-surface-900 text-[15px]">Pending Orders</h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Click an order to find the nearest driver
                </p>
              </div>
              <div className="divide-y divide-surface-50">
                {orders.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <FontAwesomeIcon icon={faGasPump} className="text-3xl text-surface-200 mb-3" />
                    <p className="text-sm text-surface-400">No pending orders</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <button
                      key={order._id}
                      onClick={() => handleSelectOrder(order)}
                      className="w-full text-left px-5 py-3.5 hover:bg-surface-50 transition-colors duration-150 group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-surface-900 text-[13px]">
                              #{order._id.slice(-6).toUpperCase()}
                            </span>
                            {order.isEmergency && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-md uppercase">
                                SOS
                              </span>
                            )}
                          </div>
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="text-[10px] text-surface-300 group-hover:text-surface-500 transition-colors"
                        />
                      </div>
                      <p className="text-xs text-surface-600 mb-0.5">
                        {order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : "Unknown customer"}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-surface-400">
                        <span className="capitalize">{order.fuelType} · {order.quantity}L</span>
                        <span>Rs. {order.pricing.totalPrice}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Driver Selection Panel */
            <div>
              {/* Order Header */}
              <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-surface-100">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-surface-900 text-[15px] flex items-center gap-2">
                    <FontAwesomeIcon icon={faRoute} className="text-primary-500 text-sm" />
                    Dispatch Order
                  </h2>
                  <button
                    onClick={handleReset}
                    className="text-xs text-surface-400 hover:text-surface-600 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
                <div className="bg-surface-50 rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[13px] text-surface-800">
                      #{selectedOrder._id.slice(-6).toUpperCase()}
                    </span>
                    {selectedOrder.isEmergency && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <FontAwesomeIcon icon={faBolt} className="text-[9px]" />
                        EMERGENCY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 truncate">
                    {selectedOrder.deliveryLocation.address}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-surface-400">
                    <span className="capitalize">
                      <FontAwesomeIcon icon={faGasPump} className="mr-1" />
                      {selectedOrder.fuelType} · {selectedOrder.quantity}L
                    </span>
                    <span className="font-semibold text-surface-600">
                      Rs. {selectedOrder.pricing.totalPrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ranked Drivers */}
              <div className="px-5 py-3">
                <p className="text-xs font-semibold text-surface-900 uppercase tracking-wider mb-3">
                  {findingDrivers
                    ? "Running A* Algorithm..."
                    : `${rankedDrivers.length} Drivers Ranked`}
                </p>

                {findingDrivers ? (
                  <div className="flex items-center justify-center py-8">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="text-2xl text-primary-500 animate-spin-slow"
                    />
                  </div>
                ) : rankedDrivers.length === 0 ? (
                  <div className="text-center py-8">
                    <FontAwesomeIcon icon={faTruck} className="text-2xl text-surface-200 mb-2" />
                    <p className="text-xs text-surface-400">No drivers available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rankedDrivers.map((driver) => {
                      const isSelected = selectedDriver?.driverId === driver.driverId;
                      return (
                        <button
                          key={driver.driverId}
                          onClick={() => handlePreviewRoute(driver)}
                          disabled={fetchingRoute}
                          className={`w-full text-left rounded-xl px-4 py-3 border transition-all duration-200 ${
                            isSelected
                              ? "border-primary-400 bg-primary-50/50 shadow-sm"
                              : "border-surface-100 hover:border-surface-200 hover:bg-surface-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Rank Badge */}
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                driver.rank === 1
                                  ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white"
                                  : driver.rank === 2
                                  ? "bg-gradient-to-br from-surface-300 to-surface-400 text-white"
                                  : driver.rank === 3
                                  ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                                  : "bg-surface-100 text-surface-500"
                              }`}
                            >
                              {driver.rank}
                            </div>

                            {/* Driver Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[13px] text-surface-800 truncate">
                                {driver.driverName}
                              </p>
                              <p className="text-[11px] text-surface-400">
                                {driver.vehicleNumber} · {driver.vehicleType}
                              </p>
                            </div>

                            {/* Distance */}
                            <div className="text-right shrink-0">
                              <p className="text-xs font-semibold text-surface-700">
                                {driver.estimatedDistanceKm} km
                              </p>
                              <p className="text-[10px] text-surface-400">
                                A* cost: {driver.estimatedCost}
                              </p>
                            </div>
                          </div>

                          {/* Route Preview for selected */}
                          {isSelected && routeData && (
                            <div className="mt-3 pt-3 border-t border-primary-100 grid grid-cols-2 gap-3 animate-fade-in">
                              <div>
                                <p className="text-[10px] text-surface-400 uppercase font-semibold mb-0.5">
                                  <FontAwesomeIcon icon={faRoad} className="mr-1" />
                                  Road Distance
                                </p>
                                <p className="text-sm font-bold text-surface-800">
                                  {routeData.distanceKm} km
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-surface-400 uppercase font-semibold mb-0.5">
                                  <FontAwesomeIcon icon={faClock} className="mr-1" />
                                  ETA
                                </p>
                                <p className="text-sm font-bold text-surface-800">
                                  {routeData.durationMinutes} min
                                </p>
                              </div>
                            </div>
                          )}

                          {isSelected && fetchingRoute && (
                            <div className="mt-3 pt-3 border-t border-primary-100 flex items-center justify-center py-2 animate-fade-in">
                              <FontAwesomeIcon
                                icon={faSpinner}
                                className="text-sm text-primary-500 animate-spin-slow mr-2"
                              />
                              <span className="text-xs text-surface-400">
                                Fetching ORS route...
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assign Button */}
              {selectedDriver && routeData && (
                <div className="sticky bottom-0 bg-white border-t border-surface-100 px-5 py-4 animate-fade-in-up">
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="w-full bg-surface-900 hover:bg-surface-800 text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-button"
                  >
                    {assigning ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin-slow" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faUserCheck} />
                        Assign {selectedDriver.driverName}
                        <span className="text-surface-400">
                          · {routeData.durationMinutes} min
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
