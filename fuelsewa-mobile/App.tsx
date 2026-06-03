import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { NavigationContainerRef } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from "./src/services/notificationService";
import { useAuthStore } from "./src/store/authStore";
import { useNotificationStore } from "./src/store/notificationStore";

// Notification types meant for each role
const CUSTOMER_TYPES = ["driver_assigned", "in_progress", "delivered", "cancelled", "order_placed"];
const DRIVER_TYPES   = ["order_assigned", "trip_started", "trip_completed"];
const ADMIN_TYPES    = ["order_placed", "trip_started", "trip_completed"];

export default function App() {
  const token = useAuthStore((s) => s.token);
  const user  = useAuthStore((s) => s.user);
  const { addNotification } = useNotificationStore();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    if (!token || !user) return;

    registerForPushNotifications();

    const cleanup = setupNotificationListeners(
      // Foreground notification received
      (notification) => {
        const { title, body } = notification.request.content;
        const data = notification.request.content.data as Record<string, string>;
        const type = data?.type ?? "info";

        // Filter: only store notifications relevant to this user's role
        const isRelevant =
          (user.role === "customer" && CUSTOMER_TYPES.includes(type)) ||
          (user.role === "driver"   && DRIVER_TYPES.includes(type));

        if (isRelevant) {
          addNotification({
            title: title ?? "FuelSewa",
            body: body ?? "",
            type,
          });
        }
      },
      // Notification tapped — navigate to Notifications tab
      (_response) => {
        if (!navigationRef.current) return;
        if (user.role === "driver") {
          navigationRef.current.navigate("DriverTabs", { screen: "Notifications" });
        } else {
          navigationRef.current.navigate("Tabs", { screen: "Notifications" });
        }
      }
    );

    return cleanup;
  }, [token, user?.role]);

  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator navigationRef={navigationRef} />
    </>
  );
}
