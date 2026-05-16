import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck } from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";

interface FormFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
}

function FormField({ label, type = "text", placeholder, required, value, onChange, options }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-surface-600">
        {label} {required && <span className="text-primary-500">*</span>}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-1 focus:ring-black transition-all"
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-1 focus:ring-black transition-all"
        />
      )}
    </div>
  );
}

export default function CreateDriverPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    email: "", password: "", contactNumber: "",
    gender: "male", dateOfBirth: "",
    citizenshipNumber: "", licenseNumber: "", licenseExpiryDate: "",
    userAddress: { district: "", state: "", localLevel: "", streetAddress: "" },
    vehicleInfo: { vehicleNumber: "", vehicleType: "truck", vehicleModel: "" },
    emergencyContact: { name: "", phone: "", relation: "" }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/drivers", form);
      navigate("/drivers");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create driver");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (path: string, value: any) => {
    const parts = path.split(".");
    if (parts.length === 1) {
      setForm({ ...form, [parts[0]]: value });
    } else {
      setForm({
        ...form,
        [parts[0]]: { ...(form as any)[parts[0]], [parts[1]]: value }
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      {/* Simple Header */}
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-surface-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/drivers")}
            className="text-surface-400 hover:text-surface-900 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h1 className="text-xl font-bold text-surface-900">Create New Driver</h1>
        </div>
        <button
          form="create-driver-form"
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-surface-800 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? "Registering..." : "Save Driver"}
          {!loading && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
        </button>
      </div>

      <form id="create-driver-form" onSubmit={handleSubmit} className="space-y-12">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Section: Basic Info */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="First Name" required value={form.firstName} onChange={(v) => updateForm("firstName", v)} />
            <FormField label="Middle Name" value={form.middleName} onChange={(v) => updateForm("middleName", v)} />
            <FormField label="Last Name" required value={form.lastName} onChange={(v) => updateForm("lastName", v)} />
            <div className="md:col-span-2">
              <FormField label="Email" type="email" required value={form.email} onChange={(v) => updateForm("email", v)} />
            </div>
            <FormField label="Password" type="password" required value={form.password} onChange={(v) => updateForm("password", v)} />
            <FormField label="Phone" type="tel" required value={form.contactNumber} onChange={(v) => updateForm("contactNumber", v)} />
            <FormField
              label="Gender"
              type="select"
              value={form.gender}
              onChange={(v) => updateForm("gender", v)}
              options={[{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }]}
            />
            <FormField label="DOB" type="date" required value={form.dateOfBirth} onChange={(v) => updateForm("dateOfBirth", v)} />
          </div>
        </section>

        {/* Section: Identity */}
        <section className="space-y-6 pt-6 border-t border-surface-100">
          <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Identity & Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Citizenship #" required value={form.citizenshipNumber} onChange={(v) => updateForm("citizenshipNumber", v)} />
            <FormField label="License #" required value={form.licenseNumber} onChange={(v) => updateForm("licenseNumber", v)} />
            <FormField label="License Expiry" type="date" required value={form.licenseExpiryDate} onChange={(v) => updateForm("licenseExpiryDate", v)} />
          </div>
        </section>

        {/* Section: Address */}
        <section className="space-y-6 pt-6 border-t border-surface-100">
          <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Residence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="State" required value={form.userAddress.state} onChange={(v) => updateForm("userAddress.state", v)} />
              <FormField label="District" required value={form.userAddress.district} onChange={(v) => updateForm("userAddress.district", v)} />
            </div>
            <FormField label="Local Level" required value={form.userAddress.localLevel} onChange={(v) => updateForm("userAddress.localLevel", v)} />
            <div className="md:col-span-2">
              <FormField label="Street Address" value={form.userAddress.streetAddress} onChange={(v) => updateForm("userAddress.streetAddress", v)} />
            </div>
          </div>
        </section>

        {/* Section: Vehicle */}
        <section className="space-y-6 pt-6 border-t border-surface-100">
          <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Vehicle Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Vehicle #" required value={form.vehicleInfo.vehicleNumber} onChange={(v) => updateForm("vehicleInfo.vehicleNumber", v)} />
            <FormField label="Model" required value={form.vehicleInfo.vehicleModel} onChange={(v) => updateForm("vehicleInfo.vehicleModel", v)} />
            <FormField
              label="Type"
              type="select"
              value={form.vehicleInfo.vehicleType}
              onChange={(v) => updateForm("vehicleInfo.vehicleType", v)}
              options={[{ label: "Truck", value: "truck" }, { label: "Van", value: "van" }, { label: "Bike", value: "bike" }]}
            />
          </div>
        </section>

        {/* Section: Emergency */}
        <section className="space-y-6 pt-6 border-t border-surface-100">
          <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Full Name" required value={form.emergencyContact.name} onChange={(v) => updateForm("emergencyContact.name", v)} />
            <FormField label="Phone" required value={form.emergencyContact.phone} onChange={(v) => updateForm("emergencyContact.phone", v)} />
            <FormField label="Relation" required value={form.emergencyContact.relation} onChange={(v) => updateForm("emergencyContact.relation", v)} />
          </div>
        </section>
      </form>
    </div>
  );
}
