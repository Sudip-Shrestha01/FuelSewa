import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faXmark } from "@fortawesome/free-solid-svg-icons";

interface Toast {
  id: number;
  title: string;
  body: string;
  orderId?: string;
  onClick?: () => void;
}

let addToastFn: ((title: string, body: string, orderId?: string, onClick?: () => void) => void) | null = null;

export const showNotificationToast = (
  title: string,
  body: string,
  orderId?: string,
  onClick?: () => void
) => {
  addToastFn?.(title, body, orderId, onClick);
};

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (title, body, orderId, onClick) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, title, body, orderId, onClick }]);
      // 5 second duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    return () => { addToastFn = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => {
            toast.onClick?.();
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }}
          className={`bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-start gap-3 ${toast.onClick ? "cursor-pointer hover:bg-gray-50" : ""} transition`}
        >
          <div className="w-9 h-9 bg-[#1D9E75]/10 rounded-lg flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faBell} className="text-[#1D9E75] text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{toast.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.body}</p>
            {toast.orderId && (
              <p className="text-xs text-[#1D9E75] font-medium mt-1">Click to view order →</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToasts((prev) => prev.filter((t) => t.id !== toast.id)); }}
            className="text-gray-300 hover:text-gray-500 transition shrink-0"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>
      ))}
    </div>
  );
}
