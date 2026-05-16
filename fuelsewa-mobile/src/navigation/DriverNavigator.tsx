import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DriverHomeScreen from "../screens/driver/DriverHomeScreen";

export type DriverStackParamList = {
  DriverHome: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
    </Stack.Navigator>
  );
}
