import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";

export default function DriverHomeScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]?.toUpperCase() ?? "D"}
          </Text>
        </View>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName} 👋</Text>
          <Text style={styles.role}>Driver</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Orders</Text>
        <Text style={styles.cardSub}>View and manage orders assigned to you by admin.</Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>View Assigned Orders</Text>
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
    backgroundColor: Colors.primaryDark,
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
    backgroundColor: Colors.primaryDark, borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  btnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  logoutBtn: { marginTop: 32, alignItems: "center" },
  logoutText: { color: Colors.danger, fontSize: 14, fontWeight: "600" },
});
