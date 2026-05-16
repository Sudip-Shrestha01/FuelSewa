import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faPhone, faEnvelope, faCalendar, faUsers } from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import PageLoader from "../components/ui/PageLoader";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import InfoSection from "../components/ui/InfoSection";
import SearchInput from "../components/ui/SearchInput";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/admin/users");
      // Filter for only customers
      setCustomers(res.data.data.filter((u: Customer) => u.role === "customer"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <PageLoader message="Loading customers..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Customers</h1>
        <p className="text-sm text-surface-400 mt-1">Manage and view registered customers.</p>
      </div>

      {/* Controls */}
      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by name, email or phone..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="bg-white border border-surface-200/80 rounded-xl overflow-hidden shadow-card">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/30">
          <p className="text-sm font-semibold text-surface-800">Customer List</p>
          <span className="text-[11px] font-medium text-surface-400 bg-white px-2.5 py-1 rounded-full border border-surface-100 shadow-sm">
            {filtered.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-surface-950 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[11px] font-bold text-surface-950 uppercase tracking-widest">Contact Info</th>
                <th className="px-6 py-4 text-[11px] font-bold text-surface-950 uppercase tracking-widest">Verification</th>
                <th className="px-6 py-4 text-[11px] font-bold text-surface-950 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-[11px] font-bold text-surface-950 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {paginated.map((customer) => (
                <tr key={customer._id} className="hover:bg-surface-50/80 transition-colors duration-150 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs shadow-sm border border-rose-200/50">
                        {customer.firstName[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-surface-800 tracking-tight">
                        {customer.firstName} {customer.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-surface-800 font-medium">{customer.email}</p>
                      <p className="text-xs text-surface-700">{customer.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={customer.isEmailVerified ? "success" : "warning"} dot>
                      {customer.isEmailVerified ? "Verified" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-surface-800 text-xs font-medium">
                    {new Date(customer.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-all active:scale-95"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginated.length === 0 && (
            <EmptyState
              icon={faUsers}
              title="No customers found"
              description="Try adjusting your search terms or filters."
            />
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemLabel="customers"
          onPageChange={setPage}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Profile"
        subtitle={selectedCustomer ? `Member since ${new Date(selectedCustomer.createdAt).getFullYear()}` : ""}
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center pb-2">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-50 to-rose-100 flex items-center justify-center text-rose-600 font-bold text-2xl shadow-lg border border-rose-200/50 mb-4 animate-scale-in">
                {selectedCustomer.firstName[0].toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-surface-900 tracking-tight">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </h3>
              <p className="text-sm text-surface-500 mt-1 uppercase tracking-widest font-bold opacity-60">
                {selectedCustomer.role}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoSection title="Contact Info" icon={faEnvelope}>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-surface-950 uppercase tracking-widest mb-1">Email Address</p>
                    <p className="text-sm font-semibold text-surface-800 break-all">{selectedCustomer.email}</p>
                    <div className="mt-1.5">
                      <Badge variant={selectedCustomer.isEmailVerified ? "success" : "warning"} className="text-[10px] px-2 py-0">
                        {selectedCustomer.isEmailVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-surface-950 uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-sm font-semibold text-surface-600">{selectedCustomer.phone}</p>
                  </div>
                </div>
              </InfoSection>

              <InfoSection title="Account Details" icon={faCalendar}>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-surface-950 uppercase tracking-widest mb-1">Account ID</p>
                    <p className="text-[11px] font-mono font-medium text-surface-600">{selectedCustomer._id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-surface-950 uppercase tracking-widest mb-1">Registration Date</p>
                    <p className="text-sm font-semibold text-surface-600">
                      {new Date(selectedCustomer.createdAt).toLocaleString("en-US", {
                        dateStyle: "long",
                        timeStyle: "short"
                      })}
                    </p>
                  </div>
                </div>
              </InfoSection>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
