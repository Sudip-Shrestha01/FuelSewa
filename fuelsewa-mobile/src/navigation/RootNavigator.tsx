import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "../store/authStore";
import AuthNavigator from "./AuthNavigator";
import CustomerNavigator from "./CustomerNavigator";
import DriverNavigator from "./DriverNavigator";
import { Colors } from "../theme/colors";

export default function RootNavigator() {
  const { token, user, loadToken } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    loadToken().finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!token || !user ? (
        <AuthNavigator />
      ) : user.role === "driver" ? (
        <DriverNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
}
