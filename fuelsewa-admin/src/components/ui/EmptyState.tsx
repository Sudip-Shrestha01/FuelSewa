import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInbox } from "@fortawesome/free-solid-svg-icons";

interface EmptyStateProps {
  icon?: IconDefinition;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon = faInbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-50 flex items-center justify-center mb-5 text-surface-300 border border-surface-100 shadow-sm">
        <FontAwesomeIcon icon={icon} className="text-2xl" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-surface-500 mt-1 max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2.5 bg-surface-900 hover:bg-surface-800 text-white text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-surface-900/10"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
