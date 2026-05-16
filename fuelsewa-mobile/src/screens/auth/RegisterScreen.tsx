import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthNavigator";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../theme/colors";

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, "Register"> };

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    phone: "", email: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const { register, loading, error, clearError } = useAuthStore();

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldError("");
    clearError();
  };

  const handleRegister = async () => {
    const { firstName, lastName, phone, email, password, confirmPassword } = form;
    if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      setFieldError("All required fields must be filled");
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setFieldError("Password must be at least 6 characters");
      return;
    }
    try {
      await register(form);
      // Navigate to login after successful registration
      navigation.navigate("Login");
    } catch {
      // error shown via store
    }
  };

  const displayError = fieldError || error;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>F</Text>
          </View>
          <Text style={styles.appName}>FuelSewa</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Customer account — free to join</Text>

          {displayError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          {/* Name Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} placeholder="Ram" placeholderTextColor={Colors.gray400}
                value={form.firstName} onChangeText={(v) => update("firstName", v)} />
            </View>
            <View style={styles.spacer} />
            <View style={[styles.inputGroup, styles.flex]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput style={styles.input} placeholder="Yadav" placeholderTextColor={Colors.gray400}
                value={form.lastName} onChangeText={(v) => update("lastName", v)} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Middle Name</Text>
            <TextInput style={styles.input} placeholder="Kumar" placeholderTextColor={Colors.gray400}
              value={form.middleName} onChangeText={(v) => update("middleName", v)} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput style={styles.input} placeholder="98XXXXXXXX" placeholderTextColor={Colors.gray400}
              value={form.phone} onChangeText={(v) => update("phone", v)}
              keyboardType="phone-pad" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.gray400}
              value={form.email} onChangeText={(v) => update("email", v)}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordRow}>
              <TextInput style={[styles.input, styles.passwordInput]}
                placeholder="Min. 6 characters" placeholderTextColor={Colors.gray400}
                value={form.password} onChangeText={(v) => update("password", v)}
                secureTextEntry={!showPassword} autoCapitalize="none" />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput style={styles.input} placeholder="Re-enter password" placeholderTextColor={Colors.gray400}
              value={form.confirmPassword} onChangeText={(v) => update("confirmPassword", v)}
              secureTextEntry autoCapitalize="none" />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: Colors.gray50, padding: 24, paddingTop: 48 },
  header: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  logoText: { color: Colors.white, fontSize: 24, fontWeight: "bold" },
  appName: { fontSize: 22, fontWeight: "bold", color: Colors.black },
  tagline: { fontSize: 13, color: Colors.gray500, marginTop: 3 },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  title: { fontSize: 20, fontWeight: "bold", color: Colors.black, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.gray500, marginBottom: 20 },
  errorBox: {
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { color: Colors.danger, fontSize: 13 },
  row: { flexDirection: "row" },
  spacer: { width: 12 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.black, backgroundColor: Colors.white,
  },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  eyeText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  roleNote: {
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  roleNoteText: { color: Colors.primaryDark, fontSize: 13 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: Colors.gray500, fontSize: 14 },
  link: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
});
