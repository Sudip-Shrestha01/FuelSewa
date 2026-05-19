import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DriverHomeScreen from "../screens/driver/DriverHomeScreen";
import DriverOrdersScreen from "../screens/driver/DriverOrdersScreen";

export type DriverStackParamList = {
  DriverHome: undefined;
  DriverOrders: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
      <Stack.Screen name="DriverOrders" component={DriverOrdersScreen} />
    </Stack.Navigator>
  );
}

