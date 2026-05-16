import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen, faClock, faCircleCheck, faCar, faUsers,
  faGasPump, faArrowTrendUp, faTriangleExclamation, faBan,
  faArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import api from "../api/axios";
import StatCard from "../components/ui/StatCard";
import PageLoader from "../components/ui/PageLoader";
import Badge from "../components/ui/Badge";

interface Order {
  _id: string;
  fuelType: string;
  quantity: number;
  status: string;
  isEmergency: boolean;
  pricing: { totalPrice: number };
  deliveryLocation: { address: string };
  userId: { firstName: string; lastName: string } | null;
  createdAt: string;
}

interface Pricing {
  petrolPricePerLiter: number;
  dieselPricePerLiter: number;
  baseFeePerKm: number;
  emergencyFee: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  accepted: "#3B82F6",
  in_progress: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "info" | "violet" | "success" | "danger"> = {
  pending: "warning",
  accepted: "info",
  in_progress: "violet",
  delivered: "success",
  cancelled: "danger",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [driverCount, setDriverCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, driversRes, customersRes, pricingRes] = await Promise.all([
          api.get("/admin/orders"),
          api.get("/admin/drivers"),
          api.get("/admin/users"),
          api.get("/pricing"),
        ]);
        setOrders(ordersRes.data.data);
        setDriverCount(driversRes.data.count);
        setCustomerCount(customersRes.data.count);
        setPricing(pricingRes.data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <PageLoader message="Loading dashboard..." />;

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.pricing.totalPrice, 0);

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );

  const statusCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    accepted: orders.filter((o) => o.status === "accepted").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dailyData = last7Days.map((day) => {
    const dayOrders = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === day.toDateString()
    );
    const dayRevenue = dayOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + o.pricing.totalPrice, 0);
    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      orders: dayOrders.length,
      revenue: dayRevenue,
    };
  });

  const statusPieData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace("_", " "), value, key: name }));

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Dashboard</h1>
          <p className="text-sm text-surface-400 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Fuel Prices */}
      {pricing && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Petrol / Liter", value: `Rs. ${pricing.petrolPricePerLiter}`, icon: faGasPump, variant: "emerald" as const },
            { label: "Diesel / Liter", value: `Rs. ${pricing.dieselPricePerLiter}`, icon: faGasPump, variant: "slate" as const },
            { label: "Base Fee / KM", value: `Rs. ${pricing.baseFeePerKm}`, icon: faArrowTrendUp, variant: "blue" as const },
            { label: "Emergency Fee", value: `Rs. ${pricing.emergencyFee}`, icon: faTriangleExclamation, variant: "red" as const },
          ].map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} variant={item.variant} />
          ))}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Orders" value={orders.length} sub={`${todayOrders.length} today`} icon={faBoxOpen} variant="slate" />
        <StatCard label="Pending" value={statusCounts.pending} sub="Awaiting assignment" icon={faClock} variant="amber" />
        <StatCard label="Completed" value={statusCounts.delivered} sub={`Rs. ${totalRevenue.toLocaleString()} earned`} icon={faCircleCheck} variant="emerald" />
        <StatCard label="Drivers" value={driverCount} sub="Registered drivers" icon={faCar} variant="blue" />
        <StatCard label="Customers" value={customerCount} sub="Registered users" icon={faUsers} variant="rose" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-surface-800">Orders — Last 7 Days</h2>
              <p className="text-xs text-surface-400 mt-0.5">Daily order volume</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-surface-500">
                <span className="w-2.5 h-2.5 rounded bg-primary-500" />
                Orders
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  padding: "8px 12px",
                }}
                cursor={{ stroke: "#e2e8f0" }}
              />
              <Area type="monotone" dataKey="orders" name="Orders" fill="url(#orderGradient)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: "#10B981", stroke: "white", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-surface-800">Order Status</h2>
            <p className="text-xs text-surface-400 mt-0.5">Distribution breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%"
                cy="42%"
                innerRadius={50}
                outerRadius={76}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {statusPieData.map((entry) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#cbd5e1"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  padding: "8px 12px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(val: string) => <span className="text-surface-500 capitalize">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white border border-surface-200/80 rounded-xl overflow-hidden shadow-card">
          <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-surface-800">Recent Orders</h2>
              <p className="text-xs text-surface-400 mt-0.5">Latest activity</p>
            </div>
            <span className="text-[11px] font-medium text-surface-400 bg-surface-50 px-2.5 py-1 rounded-full border border-surface-100">
              Latest {recentOrders.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50/50">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-surface-950 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-surface-950 uppercase tracking-wider">Fuel</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-surface-950 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-surface-950 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-surface-50/80 transition-colors duration-150">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                          {order.userId ? order.userId.firstName[0].toUpperCase() : "?"}
                        </div>
                        <div>
                          <span className="font-medium text-surface-800 text-[13px]">
                            {order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : "—"}
                          </span>
                          {order.isEmergency && (
                            <Badge variant="danger" className="ml-2 text-[9px]">SOS</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 capitalize text-surface-800 text-[13px]">{order.fuelType} · {order.quantity}L</td>
                    <td className="px-6 py-3.5 font-semibold text-surface-800 text-[13px]">Rs. {order.pricing.totalPrice}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={STATUS_BADGE_VARIANT[order.status] || "neutral"} dot>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-surface-400 text-sm">No orders yet</p>
            </div>
          )}
        </div>

        {/* Revenue + Quick Stats */}
        <div className="space-y-4">
          {/* Revenue Card */}
          <div className="bg-gradient-to-br from-surface-900 to-surface-800 rounded-xl p-6 text-white shadow-lg">
            <p className="text-xs text-surface-400 font-medium mb-1">Total Revenue</p>
            <div className="flex items-end gap-2 mb-2">
              <p className="text-3xl font-bold tracking-tight">Rs. {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
                <FontAwesomeIcon icon={faArrowUp} className="text-[9px]" />
                {statusCounts.delivered} delivered
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <StatCard
            label="Avg Order Value"
            value={`Rs. ${statusCounts.delivered > 0 ? Math.round(totalRevenue / statusCounts.delivered).toLocaleString() : 0}`}
            icon={faArrowTrendUp}
            variant="blue"
          />
          <StatCard
            label="In Progress"
            value={statusCounts.in_progress}
            sub="Active deliveries"
            icon={faCar}
            variant="violet"
          />
          <StatCard
            label="Cancelled"
            value={statusCounts.cancelled}
            sub="Cancelled orders"
            icon={faBan}
            variant="red"
          />
        </div>
      </div>
    </div>
  );
}