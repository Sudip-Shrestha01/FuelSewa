interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pagination({ page, totalPages, total, pageSize, onPrev, onNext }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-surface-100">
      <p className="text-xs text-surface-400">
        Showing <span className="font-semibold text-surface-600">{from}–{to}</span> of{" "}
        <span className="font-semibold text-surface-600">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs font-medium border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>
        <span className="text-xs text-surface-400 px-1">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page === totalPages || totalPages === 0}
          className="px-3 py-1.5 text-xs font-medium border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
