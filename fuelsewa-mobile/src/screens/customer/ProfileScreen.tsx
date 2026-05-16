import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.avatarBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.firstName?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.role}>Customer</Text>
        </View>

        <View style={styles.infoCard}>
          {[
            { icon: "email", label: "Email", value: user?.email },
            { icon: "phone", label: "Phone", value: user?.phone },
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Icon name={row.icon} size={18} color={Colors.gray400} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value ?? "—"}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Icon name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gray50 },
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 22, fontWeight: "700", color: Colors.black, marginBottom: 24 },
  avatarBox: { alignItems: "center", marginBottom: 28 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: Colors.black },
  role: { fontSize: 13, color: Colors.gray500, marginTop: 3 },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    marginBottom: 24,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.gray400 },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.black, marginTop: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.danger, borderRadius: 12, paddingVertical: 13,
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: "700" },
});
