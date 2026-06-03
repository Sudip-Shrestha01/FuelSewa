import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  orderId?: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) => {
        const notification: AppNotification = {
          ...n,
          id: `${Date.now()}-${Math.random()}`,
          read: false,
          createdAt: new Date(),
        };
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markRead: (id) => {
        set((state) => {
          const target = state.notifications.find((n) => n.id === id);
          const wasUnread = target && !target.read;
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clear: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: "fuelsewa-notifications",
      // Revive Date objects from JSON strings after hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notifications = state.notifications.map((n) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          }));
        }
      },
    }
  )
);
