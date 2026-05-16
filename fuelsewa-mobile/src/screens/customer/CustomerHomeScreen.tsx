import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";

export default function CustomerHomeScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]?.toUpperCase() ?? "C"}
          </Text>
        </View>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName} 👋</Text>
          <Text style={styles.role}>Customer</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Need Fuel?</Text>
        <Text style={styles.cardSub}>Place an order and get fuel delivered to your location.</Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Order Fuel</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50, padding: 24, paddingTop: 60 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 32 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: Colors.white, fontSize: 20, fontWeight: "bold" },
  greeting: { fontSize: 18, fontWeight: "bold", color: Colors.black },
  role: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: Colors.black, marginBottom: 6 },
  cardSub: { fontSize: 14, color: Colors.gray500, marginBottom: 16, lineHeight: 20 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  btnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  logoutBtn: { marginTop: 32, alignItems: "center" },
  logoutText: { color: Colors.danger, fontSize: 14, fontWeight: "600" },
});
