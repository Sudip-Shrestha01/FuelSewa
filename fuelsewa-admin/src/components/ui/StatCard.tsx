import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const VARIANTS: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
  slate:   { bg: "bg-surface-50",   icon: "text-surface-500",   border: "border-surface-100", glow: "group-hover:shadow-surface-500/10" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   border: "border-amber-100", glow: "group-hover:shadow-amber-500/20" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", glow: "group-hover:shadow-emerald-500/20" },
  blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    border: "border-blue-100", glow: "group-hover:shadow-blue-500/20" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    border: "border-rose-100", glow: "group-hover:shadow-rose-500/20" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  border: "border-violet-100", glow: "group-hover:shadow-violet-500/20" },
  red:     { bg: "bg-red-50",     icon: "text-red-600",     border: "border-red-100", glow: "group-hover:shadow-red-500/20" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconDefinition;
  variant?: keyof typeof VARIANTS;
  className?: string;
}

export default function StatCard({ label, value, sub, icon, variant = "slate", className = "" }: StatCardProps) {
  const v = VARIANTS[variant] ?? VARIANTS.slate;
  return (
    <div className={`group bg-white border ${v.border} rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 ${className}`}>
      <div className={`w-10 h-10 rounded-xl ${v.bg} flex items-center justify-center mb-4 transition-all duration-300 shadow-sm ${v.glow}`}>
        <FontAwesomeIcon icon={icon} className={`${v.icon} text-sm transition-transform duration-300 group-hover:scale-110`} />
      </div>
      <p className="text-2xl font-extrabold text-surface-900 tracking-tight">{value}</p>
      <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest mt-1">{label}</p>
      {sub && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-surface-50">
          <p className="text-xs font-semibold text-surface-500">{sub}</p>
        </div>
      )}
    </div>
  );
}
