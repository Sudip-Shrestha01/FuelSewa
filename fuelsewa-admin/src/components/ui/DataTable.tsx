import EmptyState from "./EmptyState";

interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function DataTable<T>({ columns, data, keyExtractor, emptyMessage = "No data available", isLoading }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-4 text-left text-[11px] font-bold text-surface-950 uppercase tracking-widest ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-50">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div className="h-4 bg-surface-100 rounded w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length > 0 ? (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-surface-50/80 transition-colors duration-150 group"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-4 ${col.className || ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title="No Records" description={emptyMessage} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
