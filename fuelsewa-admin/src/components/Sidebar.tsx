import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartPie, faBoxes, faTruck, faUsers,
  faTag, faRightFromBracket, faChevronLeft, faChevronRight,
  faMapLocationDot, faBell, faBrain,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

const links = [
  { to: "/", label: "Dashboard", icon: faChartPie },
  { to: "/orders", label: "Orders", icon: faBoxes },
  { to: "/dispatch", label: "Dispatch", icon: faMapLocationDot },
  { to: "/drivers", label: "Drivers", icon: faTruck },
  { to: "/customers", label: "Customers", icon: faUsers },
  { to: "/pricing", label: "Pricing", icon: faTag },
  { to: "/predictions", label: "AI Predictions", icon: faBrain },
];

export default function Sidebar() {
  const { logout, admin } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`${
        collapsed ? "w-[72px]" : "w-[260px]"
      } min-h-screen bg-surface-950 flex flex-col transition-all duration-300 ease-in-out relative select-none`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-700 transition-all duration-200 z-10 shadow-lg"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="text-[9px]" />
      </button>

      {/* Brand */}
      <div className={`px-5 py-6 border-b border-white/[0.06] ${collapsed ? "px-3" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-lg shadow-primary-500/20">
            F
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <span className="font-bold text-[17px] text-white tracking-tight">FuelSewa</span>
              <p className="text-[10px] text-surface-500 font-medium -mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 ${collapsed ? "px-2" : "px-3"} space-y-1`}>
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold text-surface-600 uppercase tracking-widest">
            Menu
          </p>
        )}
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `group flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${
                collapsed ? "px-0 py-2.5" : "px-3.5 py-2.5"
              } rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary-500/15 text-primary-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]"
                  : "text-surface-400 hover:bg-white/[0.04] hover:text-surface-200"
              }`
            }
          >
            <FontAwesomeIcon
              icon={link.icon}
              className={`text-sm ${collapsed ? "" : "w-4"} transition-transform duration-200 group-hover:scale-110`}
            />
            {!collapsed && <span className="animate-fade-in">{link.label}</span>}
          </NavLink>
        ))}

        {/* Notifications link with badge */}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `group flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${
              collapsed ? "px-0 py-2.5" : "px-3.5 py-2.5"
            } rounded-xl text-[13px] font-medium transition-all duration-200 relative ${
              isActive
                ? "bg-primary-500/15 text-primary-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.1)]"
                : "text-surface-400 hover:bg-white/[0.04] hover:text-surface-200"
            }`
          }
        >
          <div className="relative">
            <FontAwesomeIcon
              icon={faBell}
              className={`text-sm ${collapsed ? "" : "w-4"} transition-transform duration-200 group-hover:scale-110`}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="animate-fade-in flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
          )}
        </NavLink>
      </nav>

      {/* User info + logout */}
      <div className={`border-t border-white/[0.06] ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}>
        {!collapsed ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center text-xs font-semibold text-primary-400 shrink-0">
                {admin?.firstName?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">
                  {admin ? `${admin.firstName} ${admin.lastName}` : "Admin"}
                </p>
                <p className="text-[11px] text-surface-500 truncate">{admin?.email ?? "admin@fuelsewa.com"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-surface-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="text-[11px]" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-sm" />
          </button>
        )}
      </div>
    </aside>
  );
}
