import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGasPump, faPenToSquare, faCheck } from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import PageLoader from "../components/ui/PageLoader";

interface Pricing {
  _id: string;
  petrolPricePerLiter: number;
  dieselPricePerLiter: number;
  baseFeePerKm: number;
  emergencyFee: number;
  minimumDeliveryFee: number;
  updatedAt: string;
}

export default function PricingPage() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Pricing>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await api.get("/pricing");
      setPricing(res.data.data);
      setForm(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pricing) return;
    setSaving(true);
    try {
      await api.put("/pricing", {
        petrolPricePerLiter: form.petrolPricePerLiter,
        dieselPricePerLiter: form.dieselPricePerLiter,
        baseFeePerKm: form.baseFeePerKm,
        emergencyFee: form.emergencyFee,
        minimumDeliveryFee: form.minimumDeliveryFee,
      });
      await fetchPricing();
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader message="Loading pricing..." />;
  if (!pricing) return null;

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Fuel Pricing</h1>
          <p className="text-sm text-surface-400 mt-1">Configure global pricing rates and delivery fees.</p>
        </div>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 bg-white border border-surface-200 px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-all active:scale-[0.98] shadow-sm"
          >
            <FontAwesomeIcon icon={faPenToSquare} className="text-xs" />
            Edit Prices
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditMode(false); setForm(pricing); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-500 hover:text-surface-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-surface-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-surface-800 transition-all active:scale-[0.98] shadow-lg shadow-surface-900/10 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl">
        {/* Main Pricing Table */}
        <div className="bg-white border border-surface-200/80 rounded-2xl overflow-hidden shadow-card">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <FontAwesomeIcon icon={faGasPump} className="text-xs" />
            </div>
            <p className="text-sm font-bold text-surface-800">Standard Rates</p>
          </div>
          
          <div className="divide-y divide-surface-100">
            {[
              { label: "Petrol Price", key: "petrolPricePerLiter", unit: "per liter" },
              { label: "Diesel Price", key: "dieselPricePerLiter", unit: "per liter" },
              { label: "Base Delivery Fee", key: "baseFeePerKm", unit: "per KM" },
              { label: "Emergency Surcharge", key: "emergencyFee", unit: "fixed rate" },
              { label: "Minimum Delivery Fee", key: "minimumDeliveryFee", unit: "fixed minimum" },
            ].map((item) => (
              <div key={item.key} className="px-6 py-5 flex items-center justify-between group hover:bg-surface-50/30 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-surface-800">{item.label}</p>
                  <p className="text-[10px] font-bold text-surface-950 uppercase tracking-widest mt-0.5">{item.unit}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-surface-400">Rs.</span>
                  {editMode ? (
                    <input
                      type="number"
                      value={(form as any)[item.key]}
                      onChange={(e) => setForm({ ...form, [item.key]: parseFloat(e.target.value) })}
                      className="w-24 bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-right text-sm font-bold text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                    />
                  ) : (
                    <span className="text-lg font-bold text-surface-900">
                      {(pricing as any)[item.key]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
