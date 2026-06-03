import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { requestNotificationPermission, onForegroundMessage } from "../services/firebase";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { showNotificationToast } from "../components/NotificationToast";

export function useNotifications() {
  const { token, admin } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!token || !admin || registeredRef.current) return;
    const setup = async () => {
      try {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          await api.post("/notifications/register-token", { fcmToken });
          registeredRef.current = true;
        }
      } catch {}
    };
    setup();
  }, [token, admin]);

  useEffect(() => {
    if (!token) return;
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title ?? "FuelSewa";
      const body = payload.notification?.body ?? "";
      const orderId = payload.data?.orderId;
      const type = payload.data?.type ?? "info";

      // Play notification sound
      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.7;
        audio.play().catch(() => {});
      } catch {}

      // Store in notification center
      addNotification({ title, body, orderId, type });

      // Show toast with navigation on click
      showNotificationToast(title, body, orderId, () => {
        if (orderId) navigate("/orders", { state: { openOrderId: orderId } });
      });
    });
    return () => unsubscribe();
  }, [token, addNotification, navigate]);
}
