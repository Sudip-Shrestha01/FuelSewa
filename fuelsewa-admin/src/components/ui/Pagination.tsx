import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalItems, itemLabel = "items", onPageChange }: PaginationProps) {
  return (
    <div className="px-6 py-4 bg-surface-50/30 border-t border-surface-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs text-surface-500 font-medium">
        Showing <span className="text-surface-900">{(page - 1) * 10 + 1}</span> to{" "}
        <span className="text-surface-900">{Math.min(page * 10, totalItems)}</span> of{" "}
        <span className="text-surface-900">{totalItems}</span> {itemLabel}
      </p>
      
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-9 h-9 rounded-xl border border-surface-200 bg-white flex items-center justify-center text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              p === page
                ? "bg-surface-900 text-white shadow-md shadow-surface-900/10"
                : "bg-white border border-surface-200 text-surface-600 hover:bg-surface-50"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-9 h-9 rounded-xl border border-surface-200 bg-white flex items-center justify-center text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}
