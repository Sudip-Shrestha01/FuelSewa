interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-[2.5px]",
  lg: "w-8 h-8 border-[3px]",
};

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`${sizes[size]} border-surface-200 border-t-primary-500 rounded-full animate-spin ${className}`}
      role="status"
    />
  );
}
