import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialIcons";
import HomeScreen from "../screens/customer/HomeScreen";
import OrdersScreen from "../screens/customer/OrdersScreen";
import TrackScreen from "../screens/customer/TrackScreen";
import ProfileScreen from "../screens/customer/ProfileScreen";
import RequestFuelScreen from "../screens/customer/RequestFuelScreen";
import { Colors } from "../theme/colors";

// Tab navigator
export type CustomerTabParamList = {
  Home: undefined;
  Orders: undefined;
  Track: { orderId?: string } | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();

function CustomerTabs() {
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
          height: 62,
          paddingBottom: 8,
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
          return <Icon name={icons[route.name] ?? "circle"} size={size} color={color} />;
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

// Root stack — tabs + modal screens
export type CustomerStackParamList = {
  Tabs: undefined;
  RequestFuel: undefined;
};

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
    </Stack.Navigator>
  );
}
