import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationToast from "./NotificationToast";
import { useNotifications } from "../hooks/useNotifications";

export default function DashboardLayout() {
  useNotifications();

  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1440px] mx-auto p-6 lg:p-8">
          <div className="animate-fade-in-up">
            <Outlet />
          </div>
        </div>
      </main>
      <NotificationToast />
    </div>
  );
}
