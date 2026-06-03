import * as admin from "firebase-admin";

let initialized = false;

const getMessaging = (): admin.messaging.Messaging | null => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey ||
      projectId === "your-project-id" ||
      clientEmail.includes("your-project")) {
    return null;
  }

  if (!initialized) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        });
      }
      initialized = true;
    } catch (err: any) {
      console.warn("Firebase Admin init failed:", err.message);
      return null;
    }
  }

  return admin.messaging();
};

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Build Android config — always use fuelsewa_orders channel for custom sound
const androidConfig = (sound = "notification.wav"): admin.messaging.AndroidConfig => ({
  priority: "high",
  notification: {
    channelId: "fuelsewa_orders",
    sound,
    defaultSound: false,
  },
});

const apnsConfig: admin.messaging.ApnsConfig = {
  payload: { aps: { sound: "notification.wav", badge: 1 } },
};

export const sendNotification = async (
  fcmToken: string,
  payload: NotificationPayload
): Promise<boolean> => {
  const messaging = getMessaging();
  if (!messaging) return false;

  try {
    await messaging.send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: androidConfig(),
      apns: apnsConfig,
    });
    console.log(`✅ Notification sent to token: ...${fcmToken.slice(-6)}`);
    return true;
  } catch (error: any) {
    console.error("❌ FCM send error:", error.message);
    return false;
  }
};

export const sendMulticastNotification = async (
  fcmTokens: string[],
  payload: NotificationPayload
): Promise<void> => {
  const messaging = getMessaging();
  if (!messaging || !fcmTokens.length) return;

  try {
    const messages = fcmTokens.map((token) => ({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: androidConfig(),
      apns: apnsConfig,
    }));
    const result = await messaging.sendEach(messages);
    console.log(`✅ Multicast sent: ${result.successCount}/${fcmTokens.length} succeeded`);
  } catch (error: any) {
    console.error("❌ FCM multicast error:", error.message);
  }
};

// ─── Notification Templates ──────────────────────────────────────────────────

export const NotificationTemplates = {
  // → Admin
  orderPlaced: (orderId: string) => ({
    title: "New Order Received 🛵",
    body: "A new fuel order is waiting for driver assignment.",
    data: { type: "order_placed", orderId },
  }),

  tripStarted: (driverName: string, orderId: string) => ({
    title: "Trip Started 🚗",
    body: `${driverName} has started the delivery.`,
    data: { type: "trip_started", orderId },
  }),

  tripCompleted: (driverName: string, orderId: string) => ({
    title: "Delivery Completed ✅",
    body: `${driverName} has completed the delivery.`,
    data: { type: "trip_completed", orderId },
  }),

  // → Customer
  driverAssigned: (driverName: string, eta: number | null) => ({
    title: "Driver Assigned ✅",
    body: eta
      ? `${driverName} is on the way. ETA: ${eta} minutes.`
      : `${driverName} has been assigned to your order.`,
    data: { type: "driver_assigned" },
  }),

  orderInProgress: (driverName: string) => ({
    title: "Fuel is on the way 🚗",
    body: `${driverName} has picked up your fuel and is heading to you.`,
    data: { type: "in_progress" },
  }),

  orderDelivered: () => ({
    title: "Fuel Delivered 🎉",
    body: "Your fuel has been delivered. Thank you for using FuelSewa!",
    data: { type: "delivered" },
  }),

  orderCancelled: () => ({
    title: "Order Cancelled",
    body: "Your fuel order has been cancelled.",
    data: { type: "cancelled" },
  }),

  // → Driver
  newOrderAssigned: (orderId: string, fuelType: string, address: string) => ({
    title: "New Order Assigned 🛵",
    body: `You have a new ${fuelType} delivery to: ${address}`,
    data: { type: "order_assigned", orderId },
  }),
};
