import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-950/40 backdrop-blur-[4px] animate-overlay-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizes[size]} bg-white rounded-3xl shadow-modal overflow-hidden animate-modal-in flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between shrink-0">
          <div>
            {title && <h3 className="text-xl font-bold text-surface-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-surface-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-surface-50 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-all duration-200"
          >
            <FontAwesomeIcon icon={faXmark} className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-5 bg-surface-50/50 border-t border-surface-100 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
