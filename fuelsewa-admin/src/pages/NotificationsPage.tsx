import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faBoxOpen, faCheckDouble, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useNotificationStore } from "../store/notificationStore";

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead, clear } = useNotificationStore();

  const handleClick = (id: string, orderId?: string) => {
    markRead(id);
    if (orderId) {
      navigate("/orders", { state: { openOrderId: orderId } });
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-400 mt-0.5">{notifications.length} total</p>
        </div>
        <div className="flex gap-2">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition"
            >
              <FontAwesomeIcon icon={faTrash} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faBell} className="text-gray-300 text-xl" />
            </div>
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400">New order alerts will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n.id, n.orderId)}
                className={`flex items-start gap-4 px-5 py-4 transition cursor-pointer hover:bg-gray-50 ${!n.read ? "bg-[#1D9E75]/[0.03]" : ""}`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? "bg-[#1D9E75]/10" : "bg-gray-100"}`}>
                  <FontAwesomeIcon
                    icon={n.orderId ? faBoxOpen : faBell}
                    className={`text-sm ${!n.read ? "text-[#1D9E75]" : "text-gray-400"}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.read ? "font-semibold text-gray-800" : "font-medium text-gray-600"}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  {n.orderId && (
                    <p className="text-xs text-[#1D9E75] font-medium mt-1.5">View order details →</p>
                  )}
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-[#1D9E75] shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
