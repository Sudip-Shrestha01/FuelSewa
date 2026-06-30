import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";
import api from "../../api/axios";

interface DriverFullProfile {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  vehicleInfo?: {
    vehicleNumber: string;
    vehicleType: string;
    vehicleModel: string;
  };
  userAddress?: {
    district: string;
    localLevel: string;
    state: string;
    streetAddress?: string;
  };
  isActive: boolean;
}

export default function DriverProfileScreen() {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<DriverFullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/drivers/${user?.id}`);
        setProfile(res.data?.data || null);
      } catch {
        try {
          const res = await api.get("/profile");
          setProfile(res.data?.data || null);
        } catch {
          // fallback — use what we have from auth
        }
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchProfile();
    else setLoading(false);
  }, [user?.id]);

  const initial = profile?.firstName?.[0]?.toUpperCase() || user?.firstName?.[0]?.toUpperCase() || "D";

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar & Name */}
        <View style={styles.headerBox}>
          <View style={styles.avatar}>
            {profile?.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
          <Text style={styles.name}>
            {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
          </Text>
          <View style={styles.roleBadge}>
            <Icon name="directions-car" size={12} color={Colors.white} />
            <Text style={styles.roleText}>Driver</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: profile?.isActive ? "#10B981" : Colors.gray400 }]} />
            <Text style={styles.statusText}>{profile?.isActive ? "Online" : "Offline"}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <View style={styles.card}>
          <ProfileRow icon="email" label="Email" value={profile?.email || user?.email} />
          <ProfileRow icon="phone" label="Phone" value={profile?.contactNumber || user?.contactNumber || user?.phone} last />
        </View>

        {/* Vehicle Info */}
        {profile?.vehicleInfo && (
          <>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <View style={styles.card}>
              <ProfileRow icon="directions-car" label="Number" value={profile.vehicleInfo.vehicleNumber} />
              <ProfileRow icon="settings" label="Model" value={profile.vehicleInfo.vehicleModel} />
              <ProfileRow icon="local-gas-station" label="Type" value={profile.vehicleInfo.vehicleType} last />
            </View>
          </>
        )}

        {/* Address */}
        {profile?.userAddress && (
          <>
            <Text style={styles.sectionTitle}>Address</Text>
            <View style={styles.card}>
              <ProfileRow icon="location-on" label="State" value={profile.userAddress.state} />
              <ProfileRow icon="location-city" label="District" value={profile.userAddress.district} />
              <ProfileRow icon="pin-drop" label="Local Level" value={profile.userAddress.localLevel} last />
            </View>
          </>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ icon, label, value, last }: { icon: string; label: string; value?: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Icon name={icon as any} size={18} color={Colors.gray400} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#121212" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20 },
  headerBox: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.1)",
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: Colors.white, fontSize: 32, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700", color: Colors.white, marginBottom: 6 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(29, 158, 117, 0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    marginBottom: 8,
  },
  roleText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: Colors.gray400, fontSize: 13, fontWeight: "500" },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: Colors.gray400, marginBottom: 8,
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#1C1C1E", borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: Colors.white },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  logoutText: { color: Colors.danger, fontSize: 16, fontWeight: "700" },
});
