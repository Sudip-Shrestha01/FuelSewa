import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging, type MessagePayload } from "firebase/messaging";

const isConfigured = () => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return key && key !== "your-api-key" && key.length > 10;
};

let app: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

const getFirebaseApp = (): FirebaseApp | null => {
  if (!isConfigured()) return null;
  if (app) return app;
  if (getApps().length) { app = getApps()[0]; return app; }
  try {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    return app;
  } catch {
    return null;
  }
};

const getMessagingInstance = (): Messaging | null => {
  if (messagingInstance) return messagingInstance;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  try {
    messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch {
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  const messaging = getMessagingInstance();
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token || null;
  } catch {
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
