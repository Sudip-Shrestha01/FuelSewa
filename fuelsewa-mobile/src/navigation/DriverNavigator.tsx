import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DriverHomeScreen from "../screens/driver/DriverHomeScreen";
import DriverOrdersScreen from "../screens/driver/DriverOrdersScreen";
import DriverProfileScreen from "../screens/driver/DriverProfileScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import { Colors } from "../theme/colors";

export type DriverTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();

function DriverTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray500,
        tabBarStyle: {
          backgroundColor: "#1C1C1E",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: "home",
            Orders: "receipt-long",
            Profile: "person",
          };
          return <Icon name={(icons[route.name] ?? "circle") as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DriverHomeScreen} options={{ title: "Dashboard" }} />
      <Tab.Screen name="Orders" component={DriverOrdersScreen} options={{ title: "My Trips" }} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverTabs" component={DriverTabs} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}
