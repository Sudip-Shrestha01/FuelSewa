import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "../api/axios";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and get push token, then register with backend.
 * Works without EAS — falls back to native device push token.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices");
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Delete old channel and recreate with correct sound
  if (Platform.OS === "android") {
    await Notifications.deleteNotificationChannelAsync("fuelsewa_orders").catch(() => {});
    await Notifications.setNotificationChannelAsync("fuelsewa_orders", {
      name: "FuelSewa Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1D9E75",
      sound: "notification.wav",
      enableVibrate: true,
    });
  }

  // Try Expo push token first, fall back to native device token
  let token: string | null = null;

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data as string;
  } catch (err) {
    console.log("Could not get device push token:", err);
    return null;
  }

  // Register token with backend
  if (token) {
    try {
      await api.post("/notifications/register-token", { fcmToken: token });
      console.log("FCM token registered successfully");
    } catch (err) {
      console.log("Failed to register FCM token with backend:", err);
    }
  }

  return token;
};

/**
 * Set up notification listeners — call in App.tsx
 */
export const setupNotificationListeners = (
  onNotification?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
) => {
  const notifListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received:", notification);
    onNotification?.(notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("Notification tapped:", response);
    onResponse?.(response);
  });

  return () => {
    notifListener.remove();
    responseListener.remove();
  };
};
