import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DriverHomeScreen from "../screens/driver/DriverHomeScreen";
import DriverOrdersScreen from "../screens/driver/DriverOrdersScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import { useNotificationStore } from "../store/notificationStore";
import { Colors } from "../theme/colors";

export type DriverTabParamList = {
  Home: undefined;
  Orders: undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();

const DRIVER_TYPES = ["order_assigned", "trip_started", "trip_completed"];

function DriverTabs() {
  const insets = useSafeAreaInsets();
  const allNotifications = useNotificationStore((s) => s.notifications);
  const unreadCount = allNotifications.filter(
    (n) => !n.read && (DRIVER_TYPES.includes(n.type) || n.type === "info")
  ).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: "#F1F5F9",
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: "home",
            Orders: "assignment",
            Notifications: "notifications",
          };
          return <Icon name={(icons[route.name] ?? "circle") as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DriverHomeScreen} options={{ title: "Dashboard" }} />
      <Tab.Screen name="Orders" component={DriverOrdersScreen} options={{ title: "My Orders" }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
    </Tab.Navigator>
  );
}

export type DriverStackParamList = {
  DriverTabs: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverTabs" component={DriverTabs} />
    </Stack.Navigator>
  );
}
