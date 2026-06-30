import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/customer/HomeScreen";
import OrdersScreen from "../screens/customer/OrdersScreen";
import TrackScreen from "../screens/customer/TrackScreen";
import ProfileScreen from "../screens/customer/ProfileScreen";
import RequestFuelScreen from "../screens/customer/RequestFuelScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import { Colors } from "../theme/colors";

export type CustomerTabParamList = {
  Home: undefined;
  Orders: undefined;
  Track: { orderId?: string } | undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  Tabs: undefined;
  RequestFuel: undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();

function CustomerTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
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
            Orders: "receipt-long",
            Track: "map",
            Profile: "person",
          };
          return <Icon name={(icons[route.name] ?? "circle") as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: "My Orders" }} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={CustomerTabs} />
      <Stack.Screen
        name="RequestFuel"
        component={RequestFuelScreen}
        options={{ presentation: "card", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: "slide_from_right" }}
      />
    </Stack.Navigator>
  );
}
