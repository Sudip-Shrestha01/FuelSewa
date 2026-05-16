import Spinner from "./Spinner";

export default function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-5 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full animate-pulse-soft" />
        <Spinner size="lg" className="relative z-10" />
      </div>
      {message && (
        <p className="text-sm font-bold text-surface-400 uppercase tracking-widest animate-pulse-soft">
          {message}
        </p>
      )}
    </div>
  );
}
