import { create } from "zustand";

export interface MobileNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: MobileNotification[];
  unreadCount: number;
  addNotification: (n: Omit<MobileNotification, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: MobileNotification = {
      ...n,
      id: `${Date.now()}-${Math.random()}`,
      read: false,
      createdAt: new Date(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
