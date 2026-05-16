import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";

export type CustomerStackParamList = {
  CustomerHome: undefined;
};

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
    </Stack.Navigator>
  );
}
