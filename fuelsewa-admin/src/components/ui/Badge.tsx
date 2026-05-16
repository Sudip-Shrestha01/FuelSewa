const VARIANTS = {
  primary: "bg-primary-50 text-primary-700 border-primary-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger:  "bg-red-50 text-red-700 border-red-100",
  info:    "bg-blue-50 text-blue-700 border-blue-100",
  violet:  "bg-violet-50 text-violet-700 border-violet-100",
  neutral: "bg-surface-100 text-surface-600 border-surface-200",
};

const DOT_COLORS = {
  primary: "bg-primary-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-blue-500",
  violet:  "bg-violet-500",
  neutral: "bg-surface-400",
};

interface BadgeProps {
  variant?: keyof typeof VARIANTS;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = "neutral", dot = false, children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize tracking-tight shadow-sm transition-all duration-200 hover:scale-[1.02] ${VARIANTS[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant]} animate-pulse-soft`} />}
      {children}
    </span>
  );
}
