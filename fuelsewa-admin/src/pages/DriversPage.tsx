import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faUser, faCar, faIdCard,
  faPhone, faPenToSquare, faTrash, faCheck, faTruck,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import PageLoader from "../components/ui/PageLoader";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import InfoSection from "../components/ui/InfoSection";
import SearchInput from "../components/ui/SearchInput";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";

interface Driver {
  _id: string; firstName: string; middleName: string; lastName: string;
  contactNumber: string; email: string; gender: string; dateOfBirth: string;
  citizenshipNumber: string; licenseNumber: string; licenseExpiryDate: string; isActive: boolean;
  userAddress: { district: string; state: string; localLevel: string; streetAddress: string };
  vehicleInfo: { vehicleNumber: string; vehicleType: string; vehicleModel: string };
  emergencyContact: { name: string; phone: string; relation: string }; 
  location?: { latitude: number; longitude: number };
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function DriversPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDrivers = async () => {
    try { const res = await api.get("/admin/drivers"); setDrivers(res.data.data); } finally { setLoading(false); }
  };
  useEffect(() => { fetchDrivers(); }, []);

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) || d.contactNumber.includes(q) || d.email.toLowerCase().includes(q) || d.vehicleInfo?.vehicleNumber?.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleStatus = async (driver: Driver) => {
    try { await api.patch(`/admin/drivers/${driver._id}/toggle-status`); await fetchDrivers(); } catch {}
  };

  const handleEditSave = async () => {
    if (!editDriver) return; setSaving(true);
    try { await api.put(`/drivers/${editDriver._id}`, editForm); await fetchDrivers(); setEditDriver(null); } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await api.delete(`/drivers/${deleteTarget._id}`); await fetchDrivers(); setDeleteTarget(null); } catch {}
    setDeleting(false);
  };

  if (loading) return <PageLoader message="Loading drivers..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Drivers</h1>
          <p className="text-sm text-surface-400 mt-1">Track, manage and create drivers.</p>
        </div>
        <button
          onClick={() => navigate("/drivers/create")}
          className="flex items-center gap-2 bg-surface-900 hover:bg-surface-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-surface-900/10 active:scale-[0.98] shrink-0"
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
          Create Driver
        </button>
      </div>

      {/* Search */}
      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="max-w-xs" />

      {/* Table */}
      <div className="bg-white border border-surface-200/80 rounded-xl overflow-hidden shadow-card">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-800">Driver List</p>
          <span className="text-[11px] font-medium text-surface-400 bg-surface-50 px-2.5 py-1 rounded-full border border-surface-100">{filtered.length} drivers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                {["Name","Contact","Vehicle","License","Location","Status","Action"].map(h => (
                  <th key={h} className="px-6 py-3.5 text-left text-[11px] font-semibold text-surface-950 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {paginated.map((driver) => (
                <tr key={driver._id} className="hover:bg-surface-50/80 transition-colors duration-150">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center text-xs font-semibold text-violet-600 shrink-0">
                        {driver.firstName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-surface-800 text-[13px]">{driver.firstName} {driver.middleName} {driver.lastName}</p>
                        <p className="text-[11px] text-surface-700 truncate">{driver.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-surface-800 text-[13px]">{driver.contactNumber}</td>
                  <td className="px-6 py-3.5">
                    <p className="text-surface-700 font-medium text-[13px]">{driver.vehicleInfo?.vehicleNumber}</p>
                    <p className="text-[11px] text-surface-700 capitalize">{driver.vehicleInfo?.vehicleType} · {driver.vehicleInfo?.vehicleModel}</p>
                  </td>
                  <td className="px-6 py-3.5 text-surface-800 text-[13px] font-mono">{driver.licenseNumber}</td>
                  <td className="px-6 py-3.5 text-surface-700 text-[13px]">{driver.userAddress?.district}, {driver.userAddress?.state}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={driver.isActive ? "success" : "neutral"} dot>{driver.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleStatus(driver)} className="px-2.5 py-1.5 text-[11px] font-medium text-surface-500 hover:text-surface-700 hover:bg-surface-50 rounded-lg transition-all duration-150">
                        {driver.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => { setEditDriver(driver); setEditForm({ firstName:driver.firstName, middleName:driver.middleName, lastName:driver.lastName, contactNumber:driver.contactNumber, licenseNumber:driver.licenseNumber, vehicleInfo:driver.vehicleInfo, emergencyContact:driver.emergencyContact, location:driver.location }); }}
                        className="w-7 h-7 rounded-lg hover:bg-info-50 flex items-center justify-center text-info-500 transition-all duration-150"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} className="text-[11px]" />
                      </button>
                      <button onClick={() => setSelectedDriver(driver)} className="w-7 h-7 rounded-lg hover:bg-primary-50 flex items-center justify-center text-primary-600 transition-all duration-150">
                        <FontAwesomeIcon icon={faUser} className="text-[11px]" />
                      </button>
                      <button onClick={() => setDeleteTarget(driver)} className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-danger-500 transition-all duration-150">
                        <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginated.length === 0 && <EmptyState icon={faTruck} title="No drivers found" description="No drivers match your search criteria." />}
        </div>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(totalPages, p + 1))} />
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedDriver} onClose={() => setSelectedDriver(null)} title="Driver Details">
        {selectedDriver && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center text-violet-600 font-bold text-xl">{selectedDriver.firstName[0].toUpperCase()}</div>
              <div>
                <p className="font-semibold text-surface-900 text-lg tracking-tight">{selectedDriver.firstName} {selectedDriver.middleName} {selectedDriver.lastName}</p>
                <p className="text-sm text-surface-400 capitalize">{selectedDriver.gender} · DOB: {new Date(selectedDriver.dateOfBirth).toLocaleDateString()}</p>
                <Badge variant={selectedDriver.isActive?"success":"neutral"} dot className="mt-1">{selectedDriver.isActive?"Active":"Inactive"}</Badge>
              </div>
            </div>
            <InfoSection title="Contact" icon={faPhone}><div className="grid grid-cols-2 gap-y-2 text-sm"><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Email</p><p className="font-medium text-surface-600">{selectedDriver.email}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Phone</p><p className="font-medium text-surface-600">{selectedDriver.contactNumber}</p></div></div></InfoSection>
            <InfoSection title="Address" icon={faUser}><div className="grid grid-cols-2 gap-y-2 text-sm"><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">District</p><p className="font-medium text-surface-600">{selectedDriver.userAddress?.district}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Local Level</p><p className="font-medium text-surface-600">{selectedDriver.userAddress?.localLevel}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">State</p><p className="font-medium text-surface-600">{selectedDriver.userAddress?.state}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Street</p><p className="font-medium text-surface-600">{selectedDriver.userAddress?.streetAddress||"—"}</p></div></div></InfoSection>
            <InfoSection title="Documents" icon={faIdCard}><div className="grid grid-cols-2 gap-y-2 text-sm"><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Citizenship No.</p><p className="font-medium text-surface-600">{selectedDriver.citizenshipNumber}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">License No.</p><p className="font-medium text-surface-600">{selectedDriver.licenseNumber}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">License Expiry</p><p className="font-medium text-surface-600">{new Date(selectedDriver.licenseExpiryDate).toLocaleDateString()}</p></div></div></InfoSection>
            <InfoSection title="Vehicle" icon={faCar}><div className="grid grid-cols-2 gap-y-2 text-sm"><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Model</p><p className="font-medium text-surface-600">{selectedDriver.vehicleInfo?.vehicleModel}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Type</p><p className="font-medium text-surface-600 capitalize">{selectedDriver.vehicleInfo?.vehicleType}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Number</p><p className="font-medium text-surface-600">{selectedDriver.vehicleInfo?.vehicleNumber}</p></div></div></InfoSection>
            <InfoSection title="Emergency Contact" icon={faPhone}><div className="grid grid-cols-2 gap-y-2 text-sm"><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Name</p><p className="font-medium text-surface-600">{selectedDriver.emergencyContact?.name}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Phone</p><p className="font-medium text-surface-600">{selectedDriver.emergencyContact?.phone}</p></div><div><p className="text-xs text-surface-950 font-bold uppercase tracking-tight">Relation</p><p className="font-medium text-surface-600">{selectedDriver.emergencyContact?.relation}</p></div></div></InfoSection>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editDriver} onClose={() => setEditDriver(null)} title="Edit Driver"
        footer={<><button onClick={() => setEditDriver(null)} className="px-5 py-2.5 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition-all">Cancel</button><button onClick={handleEditSave} disabled={saving} className="px-5 py-2.5 text-sm font-medium text-white bg-surface-900 hover:bg-surface-800 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"><FontAwesomeIcon icon={faCheck}/>{saving?"Saving...":"Save Changes"}</button></>}>
        {editDriver && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[{l:"First Name",k:"firstName"},{l:"Middle Name",k:"middleName"},{l:"Last Name",k:"lastName"},{l:"Contact Number",k:"contactNumber"},{l:"License Number",k:"licenseNumber"}].map(({l,k})=>(
                <div key={k}><label className="block text-xs font-medium text-surface-600 mb-1.5">{l}</label><input type="text" value={(editForm as any)[k]??""} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))} className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"/></div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider pt-1">Vehicle Info</p>
            <div className="grid grid-cols-2 gap-3">
              {[{l:"Vehicle Number",k:"vehicleNumber"},{l:"Vehicle Model",k:"vehicleModel"}].map(({l,k})=>(
                <div key={k}><label className="block text-xs font-medium text-surface-600 mb-1.5">{l}</label><input type="text" value={(editForm.vehicleInfo as any)?.[k]??""} onChange={e=>setEditForm(p=>({...p,vehicleInfo:{...(p.vehicleInfo as any),[k]:e.target.value}}))} className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"/></div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider pt-1">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              {[{l:"Name",k:"name"},{l:"Phone",k:"phone"},{l:"Relation",k:"relation"}].map(({l,k})=>(
                <div key={k}><label className="block text-xs font-medium text-surface-600 mb-1.5">{l}</label><input type="text" value={(editForm.emergencyContact as any)?.[k]??""} onChange={e=>setEditForm(p=>({...p,emergencyContact:{...(p.emergencyContact as any),[k]:e.target.value}}))} className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"/></div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider pt-1">Location</p>
            <div className="grid grid-cols-2 gap-3">
              {[{l:"Latitude",k:"latitude"},{l:"Longitude",k:"longitude"}].map(({l,k})=>(
                <div key={k}><label className="block text-xs font-medium text-surface-600 mb-1.5">{l}</label><input type="number" step="any" value={(editForm.location as any)?.[k]??""} onChange={e=>setEditForm(p=>({...p,location:{...(p.location as any),[k]:Number(e.target.value)}}))} className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"/></div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        {deleteTarget && (
          <div className="text-center">
            <div className="w-14 h-14 bg-danger-50 rounded-2xl flex items-center justify-center mx-auto mb-5"><FontAwesomeIcon icon={faTrash} className="text-danger-500 text-lg"/></div>
            <h2 className="font-semibold text-surface-900 text-lg mb-2">Delete Driver</h2>
            <p className="text-sm text-surface-500 mb-6">Are you sure you want to delete <span className="font-semibold text-surface-700">{deleteTarget.firstName} {deleteTarget.lastName}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-surface-200 text-surface-600 text-sm font-medium py-2.5 rounded-xl hover:bg-surface-50 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-danger-500 hover:bg-danger-600 text-white text-sm font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]">{deleting?"Deleting...":"Yes, Delete"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
