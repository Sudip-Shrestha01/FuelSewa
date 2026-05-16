import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface InfoSectionProps {
  title: string;
  icon?: IconDefinition;
  children: React.ReactNode;
  variant?: "default" | "warning" | "success" | "danger" | "info";
}

const variants = {
  default: "bg-surface-50 text-surface-500",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
  danger: "bg-red-50 text-red-500",
  info: "bg-blue-50 text-blue-600",
};

export default function InfoSection({ title, icon, children, variant = "default" }: InfoSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon && (
          <div className={`w-6 h-6 rounded-lg ${variants[variant]} flex items-center justify-center`}>
            <FontAwesomeIcon icon={icon} className="text-[10px]" />
          </div>
        )}
        <h4 className="text-[11px] font-bold text-surface-950 uppercase tracking-widest">
          {title}
        </h4>
      </div>
      <div className="bg-surface-50/50 rounded-2xl p-4 border border-surface-100">
        {children}
      </div>
    </div>
  );
}
