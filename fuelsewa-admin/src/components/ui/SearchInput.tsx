import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faXmark } from "@fortawesome/free-solid-svg-icons";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Search...", className = "" }: SearchInputProps) {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 transition-colors group-focus-within:text-primary-500 pointer-events-none">
        <FontAwesomeIcon icon={faSearch} className="text-sm" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-surface-200 rounded-xl pl-11 pr-11 py-2.5 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-400 focus:shadow-sm transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-surface-300 hover:text-surface-500 hover:bg-surface-50 transition-all duration-150"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      )}
    </div>
  );
}
