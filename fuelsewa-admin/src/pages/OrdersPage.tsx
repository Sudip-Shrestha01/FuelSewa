import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye, faUserPlus, faGasPump, faBoxes,
  faLocationDot, faUser, faNoteSticky, faCircleCheck, faBan,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import PageLoader from "../components/ui/PageLoader";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import InfoSection from "../components/ui/InfoSection";
import EmptyState from "../components/ui/EmptyState";

interface Customer { _id: string; firstName: string; lastName: string; email: string; phone: string; }
interface Driver { _id: string; firstName: string; lastName: string; contactNumber: string; vehicleInfo: { vehicleNumber: string; vehicleType: string; vehicleModel: string }; }
interface Order {
  _id: string; fuelType: string; quantity: number; status: string; isEmergency: boolean; priority: string;
  requestSource: string; note: string; cancelReason?: string;
  pricing: { pricePerLiter: number; fuelCost: number; deliveryFee: number; emergencyFee: number; totalPrice: number; };
  deliveryLocation: { address: string; landmark: string; latitude: number; longitude: number };
  userId: Customer | null; assignedDriverId: Driver | null; estimatedDeliveryMinutes: number | null; createdAt: string;
}

const BADGE_V: Record<string, "warning"|"info"|"violet"|"success"|"danger"> = { pending:"warning", accepted:"info", in_progress:"violet", delivered:"success", cancelled:"danger" };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]); const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true); const [activeTab, setActiveTab] = useState<"active"|"completed">("active");
  const [sel, setSel] = useState<Order|null>(null); const [showAssign, setShowAssign] = useState(false);
  const [driverId, setDriverId] = useState(""); const [estMin, setEstMin] = useState("");
  const [assigning, setAssigning] = useState(false); const [assignErr, setAssignErr] = useState("");

  const fetch = async () => { try { const [o,d] = await Promise.all([api.get("/admin/orders"),api.get("/admin/drivers")]); setOrders(o.data.data); setDrivers(d.data.data); } finally { setLoading(false); } };
  useEffect(() => { fetch(); }, []);

  const active = orders.filter(o => !["delivered","cancelled"].includes(o.status));
  const completed = orders.filter(o => ["delivered","cancelled"].includes(o.status));
  const displayed = activeTab === "active" ? active : completed;

  const handleAssign = async () => {
    if (!sel || !driverId) return; setAssigning(true); setAssignErr("");
    try { await api.patch(`/admin/orders/${sel._id}`, { status:"accepted", assignedDriverId:driverId, estimatedDeliveryMinutes:estMin?parseInt(estMin):undefined }); await fetch(); setShowAssign(false); setSel(null); setDriverId(""); setEstMin("");
    } catch (e:any) { setAssignErr(e.response?.data?.message||"Failed to assign driver"); } finally { setAssigning(false); }
  };

  if (loading) return <PageLoader message="Loading orders..." />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-surface-900">Orders</h1><p className="text-sm text-surface-400 mt-1">{orders.length} total orders</p></div>
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {(["active","completed"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab===tab?"bg-white text-surface-900 shadow-sm":"text-surface-400 hover:text-surface-600"}`}>
            {tab==="active"?`Active (${active.length})`:`Completed (${completed.length})`}
          </button>
        ))}
      </div>
      <div className="bg-white border border-surface-200/80 rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-surface-100 bg-surface-50/50">
              {["Customer","Fuel","Address","Amount","Driver","Status","Date","Actions"].map(h=><th key={h} className="px-6 py-3.5 text-left text-[11px] font-semibold text-surface-950 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-surface-50">
              {displayed.map(order => (
                <tr key={order._id} className="hover:bg-surface-50/80 transition-colors duration-150">
                  <td className="px-6 py-3.5"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 shrink-0">{order.userId?order.userId.firstName[0].toUpperCase():"?"}</div><div className="min-w-0"><p className="font-medium text-surface-800 text-[13px] truncate">{order.userId?`${order.userId.firstName} ${order.userId.lastName}`:"—"}</p><p className="text-[11px] text-surface-700">{order.userId?.phone}</p></div>{order.isEmergency&&<Badge variant="danger" className="text-[9px]">SOS</Badge>}</div></td>
                  <td className="px-6 py-3.5 capitalize text-surface-800 text-[13px]">{order.fuelType} · {order.quantity}L</td>
                  <td className="px-6 py-3.5 text-surface-700 max-w-[160px] truncate text-[13px]">{order.deliveryLocation.address}</td>
                  <td className="px-6 py-3.5 font-semibold text-surface-800 text-[13px]">Rs. {order.pricing.totalPrice}</td>
                  <td className="px-6 py-3.5 text-surface-800 text-[13px]">{order.assignedDriverId?`${order.assignedDriverId.firstName} ${order.assignedDriverId.lastName}`:<span className="text-surface-300">—</span>}</td>
                  <td className="px-6 py-3.5"><Badge variant={BADGE_V[order.status]||"neutral"} dot>{order.status.replace("_"," ")}</Badge></td>
                  <td className="px-6 py-3.5 text-surface-700 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5"><div className="flex items-center gap-1.5">
                    <button onClick={() => {setSel(order);setShowAssign(false);}} className="w-8 h-8 rounded-lg bg-surface-50 hover:bg-surface-100 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-all duration-150"><FontAwesomeIcon icon={faEye} className="text-xs"/></button>
                    {activeTab==="active"&&order.status==="pending"&&<button onClick={() => {setSel(order);setShowAssign(true);}} className="w-8 h-8 rounded-lg bg-primary-50 hover:bg-primary-100 flex items-center justify-center text-primary-600 transition-all duration-150"><FontAwesomeIcon icon={faUserPlus} className="text-xs"/></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length===0&&<EmptyState icon={faBoxes} title="No orders found" description={activeTab==="active"?"No active orders.":"No completed orders yet."}/>}
      </div>

      {/* Detail Modal */}
      <Modal open={!!sel&&!showAssign} onClose={() => {setSel(null);setAssignErr("");}} title="Order Details" subtitle={sel?`#${sel._id.slice(-8).toUpperCase()}`:""}>
        {sel&&!showAssign&&<div className="space-y-4">
          <div className="flex flex-wrap gap-2"><Badge variant={BADGE_V[sel.status]||"neutral"} dot>{sel.status.replace("_"," ")}</Badge>{sel.isEmergency&&<Badge variant="danger">Emergency</Badge>}<Badge variant="neutral">{sel.priority} priority</Badge></div>
          <InfoSection title="Customer" icon={faUser}><p className="font-semibold text-surface-600">{sel.userId?`${sel.userId.firstName} ${sel.userId.lastName}`:"—"}</p><p className="text-sm text-surface-600">{sel.userId?.email}</p><p className="text-sm text-surface-600">{sel.userId?.phone}</p></InfoSection>
          <InfoSection title="Fuel Info" icon={faGasPump}><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight mb-0.5">Type</p><p className="font-medium capitalize text-surface-600">{sel.fuelType}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight mb-0.5">Quantity</p><p className="font-medium text-surface-600">{sel.quantity} L</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight mb-0.5">Price/L</p><p className="font-medium text-surface-600">Rs. {sel.pricing.pricePerLiter}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight mb-0.5">Source</p><p className="font-medium capitalize text-surface-600">{sel.requestSource}</p></div></div></InfoSection>
          <InfoSection title="Location" icon={faLocationDot}><p className="text-sm font-medium text-surface-600">{sel.deliveryLocation.address}</p>{sel.deliveryLocation.landmark&&<p className="text-xs text-surface-600 mt-0.5">{sel.deliveryLocation.landmark}</p>}</InfoSection>
          <InfoSection title="Pricing"><div className="space-y-2 text-sm"><div className="flex justify-between text-surface-600"><span>Fuel Cost</span><span>Rs. {sel.pricing.fuelCost}</span></div><div className="flex justify-between text-surface-600"><span>Delivery Fee</span><span>Rs. {sel.pricing.deliveryFee}</span></div>{sel.pricing.emergencyFee>0&&<div className="flex justify-between text-danger-500"><span>Emergency Fee</span><span>Rs. {sel.pricing.emergencyFee}</span></div>}<div className="flex justify-between font-semibold text-surface-950 border-t border-surface-200 pt-2 mt-1"><span>Total</span><span>Rs. {sel.pricing.totalPrice}</span></div></div></InfoSection>
          {sel.note&&<InfoSection title="Note" icon={faNoteSticky} variant="warning"><p className="text-sm text-surface-600">{sel.note}</p></InfoSection>}
          {sel.status==="cancelled"&&<InfoSection title="Cancellation Reason" icon={faBan} variant="danger"><p className="text-sm text-surface-600">{sel.cancelReason||<span className="text-surface-400 italic">No reason provided</span>}</p></InfoSection>}
          {sel.assignedDriverId&&<InfoSection title="Assigned Driver" icon={faCircleCheck} variant="success"><p className="font-semibold text-surface-600">{sel.assignedDriverId.firstName} {sel.assignedDriverId.lastName}</p><p className="text-sm text-surface-600">{sel.assignedDriverId.contactNumber}</p><p className="text-xs text-surface-600 mt-0.5">{sel.assignedDriverId.vehicleInfo?.vehicleModel} · {sel.assignedDriverId.vehicleInfo?.vehicleNumber}</p></InfoSection>}
          {sel.status==="pending"&&<button onClick={() => setShowAssign(true)} className="w-full bg-surface-900 hover:bg-surface-800 text-white font-medium py-3 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 active:scale-[0.98]"><FontAwesomeIcon icon={faUserPlus}/>Assign Driver</button>}
        </div>}
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!sel&&showAssign} onClose={() => {setShowAssign(false);setSel(null);setAssignErr("");}} title="Assign Driver" subtitle={sel?`Order #${sel._id.slice(-8).toUpperCase()}`:""} footer={<><button onClick={() => {setShowAssign(false);setAssignErr("");}} className="px-5 py-2.5 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition-all">Back</button><button onClick={handleAssign} disabled={!driverId||assigning} className="px-5 py-2.5 text-sm font-medium text-white bg-surface-900 hover:bg-surface-800 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">{assigning?"Assigning...":"Confirm Assign"}</button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-700 mb-2">Select Driver</label><select value={driverId} onChange={e => setDriverId(e.target.value)} className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"><option value="">— Choose a driver —</option>{drivers.map(d=><option key={d._id} value={d._id}>{d.firstName} {d.lastName} · {d.vehicleInfo?.vehicleNumber}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-2">Estimated Delivery (min) <span className="text-surface-400 font-normal">— optional</span></label><input type="number" min={1} value={estMin} onChange={e=>setEstMin(e.target.value)} placeholder="e.g. 20" className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"/></div>
          {assignErr&&<p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-xl px-4 py-3 animate-fade-in-down">{assignErr}</p>}
        </div>
      </Modal>
    </div>
  );
}
