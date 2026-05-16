import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as Location from "expo-location";
import api from "../../api/axios";
import { Colors } from "../../theme/colors";

interface Pricing {
  petrolPricePerLiter: number;
  dieselPricePerLiter: number;
  deliveryFee: number;
  emergencyFee: number;
  minimumDeliveryFee: number;
}

const FUEL_TYPES = [
  { key: "petrol", label: "Petrol", icon: "local-gas-station", color: "#EA580C", bg: "#FFF7ED" },
  { key: "diesel", label: "Diesel", icon: "local-gas-station", color: Colors.primary, bg: "#F0FDF4" },
];

const SOURCES = [
  { key: "roadside", label: "Roadside", icon: "warning" },
  { key: "home", label: "Home", icon: "home" },
  { key: "office", label: "Office", icon: "business" },
  { key: "other", label: "Other", icon: "place" },
];

export default function RequestFuelScreen({ navigation }: any) {
  const [fuelType, setFuelType] = useState<"petrol" | "diesel">("petrol");
  const [quantity, setQuantity] = useState(2);
  const [requestSource, setRequestSource] = useState("roadside");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/pricing").then((res) => setPricing(res.data.data)).catch(() => {});
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is needed to detect your position.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        const parts = [place.street, place.district, place.city, place.region].filter(Boolean);
        setAddress(parts.join(", "));
      }
    } catch {
      Alert.alert("Error", "Could not detect location. Please enter manually.");
    } finally {
      setLocating(false);
    }
  };

  const pricePerLiter = pricing
    ? fuelType === "petrol" ? pricing.petrolPricePerLiter : pricing.dieselPricePerLiter
    : 0;
  const fuelCost = pricePerLiter * quantity;
  const deliveryFee = pricing?.minimumDeliveryFee ?? 80;
  const emergencyFee = requestSource === "roadside" ? (pricing?.emergencyFee ?? 10) : 0;
  const totalPrice = fuelCost + deliveryFee + emergencyFee;

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert("Location required", "Please detect or enter your delivery address.");
      return;
    }
    if (!coords) {
      Alert.alert("Location required", "Please allow location access or enter coordinates.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/orders", {
        fuelType,
        quantity,
        deliveryLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: address.trim(),
          landmark: landmark.trim(),
        },
        requestSource,
        note: note.trim(),
      });
      Alert.alert(
        "Order Placed!",
        "Your fuel request has been submitted. Admin will assign a driver shortly.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to place order. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color={Colors.black} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Request Fuel</Text>
            <Text style={styles.headerSub}>Fill in the details below</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Fuel Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fuel Type</Text>
            <View style={styles.fuelRow}>
              {FUEL_TYPES.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.fuelCard, fuelType === f.key && { borderColor: f.color, borderWidth: 2 }]}
                  onPress={() => setFuelType(f.key as "petrol" | "diesel")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fuelIconBox, { backgroundColor: f.bg }]}>
                    <Icon name={f.icon} size={26} color={f.color} />
                  </View>
                  <Text style={[styles.fuelLabel, fuelType === f.key && { color: f.color }]}>{f.label}</Text>
                  {pricing && (
                    <Text style={styles.fuelPrice}>
                      Rs. {f.key === "petrol" ? pricing.petrolPricePerLiter : pricing.dieselPricePerLiter}/L
                    </Text>
                  )}
                  {fuelType === f.key && (
                    <View style={[styles.fuelCheck, { backgroundColor: f.color }]}>
                      <Icon name="check" size={12} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quantity (Liters)</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Icon name="remove" size={20} color={quantity <= 1 ? Colors.gray300 : Colors.black} />
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <Text style={styles.qtyUnit}>liters</Text>
              </View>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity >= 20 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity((q) => Math.min(20, q + 1))}
                disabled={quantity >= 20}
              >
                <Icon name="add" size={20} color={quantity >= 20 ? Colors.gray300 : Colors.black} />
              </TouchableOpacity>
            </View>
            <View style={styles.qtySliderRow}>
              {[1, 2, 3, 4, 5, 10, 15, 20].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.qtyChip, quantity === v && styles.qtyChipActive]}
                  onPress={() => setQuantity(v)}
                >
                  <Text style={[styles.qtyChipText, quantity === v && styles.qtyChipTextActive]}>{v}L</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Request Source */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Request Source</Text>
            <View style={styles.sourceGrid}>
              {SOURCES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sourceCard, requestSource === s.key && styles.sourceCardActive]}
                  onPress={() => setRequestSource(s.key)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={s.icon}
                    size={20}
                    color={requestSource === s.key ? Colors.primary : Colors.gray400}
                  />
                  <Text style={[styles.sourceLabel, requestSource === s.key && styles.sourceLabelActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {requestSource === "roadside" && (
              <View style={styles.emergencyNote}>
                <Icon name="warning" size={14} color="#D97706" />
                <Text style={styles.emergencyNoteText}>Emergency fee of Rs. {pricing?.emergencyFee ?? 10} applies</Text>
              </View>
            )}
          </View>

          {/* Delivery Location */}
          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>Delivery Location</Text>
              <TouchableOpacity style={styles.detectBtn} onPress={detectLocation} disabled={locating}>
                {locating
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <><Icon name="my-location" size={14} color={Colors.primary} /><Text style={styles.detectText}> Detect</Text></>
                }
              </TouchableOpacity>
            </View>
            <View style={styles.inputBox}>
              <Icon name="location-on" size={18} color={Colors.gray400} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your delivery address"
                placeholderTextColor={Colors.gray400}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
            <View style={[styles.inputBox, { marginTop: 10 }]}>
              <Icon name="place" size={18} color={Colors.gray400} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Landmark (optional)"
                placeholderTextColor={Colors.gray400}
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>
            {coords && (
              <Text style={styles.coordsText}>
                📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </Text>
            )}
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Note <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.inputBox}>
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder="e.g. Bike stopped near petrol pump road"
                placeholderTextColor={Colors.gray400}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Price Summary */}
          {pricing && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Price Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Fuel Cost ({quantity}L × Rs. {pricePerLiter})</Text>
                <Text style={styles.summaryVal}>Rs. {fuelCost}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Delivery Fee</Text>
                <Text style={styles.summaryVal}>Rs. {deliveryFee}</Text>
              </View>
              {emergencyFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: "#D97706" }]}>Emergency Fee</Text>
                  <Text style={[styles.summaryVal, { color: "#D97706" }]}>Rs. {emergencyFee}</Text>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalVal}>Rs. {totalPrice}</Text>
              </View>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <Icon name="local-gas-station" size={20} color={Colors.white} />
                  <Text style={styles.submitText}>Place Order · Rs. {totalPrice}</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gray50 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.black },
  headerSub: { fontSize: 12, color: Colors.gray500, marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: Colors.gray700, marginBottom: 12 },
  sectionLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  optional: { fontWeight: "400", color: Colors.gray400 },

  // Fuel type
  fuelRow: { flexDirection: "row", gap: 12 },
  fuelCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    alignItems: "center", borderWidth: 1.5, borderColor: Colors.gray200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    position: "relative",
  },
  fuelIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  fuelLabel: { fontSize: 15, fontWeight: "700", color: Colors.black },
  fuelPrice: { fontSize: 12, color: Colors.gray500, marginTop: 3 },
  fuelCheck: {
    position: "absolute", top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },

  // Quantity
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 16 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.gray200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  qtyBtnDisabled: { borderColor: Colors.gray100, backgroundColor: Colors.gray50 },
  qtyDisplay: { alignItems: "center", minWidth: 80 },
  qtyValue: { fontSize: 36, fontWeight: "800", color: Colors.black },
  qtyUnit: { fontSize: 12, color: Colors.gray400, marginTop: -2 },
  qtySliderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qtyChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200,
  },
  qtyChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  qtyChipText: { fontSize: 13, fontWeight: "600", color: Colors.gray600 },
  qtyChipTextActive: { color: Colors.primary },

  // Source
  sourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sourceCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.gray200,
  },
  sourceCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  sourceLabel: { fontSize: 13, fontWeight: "600", color: Colors.gray600 },
  sourceLabelActive: { color: Colors.primary },
  emergencyNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 10, marginTop: 10,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  emergencyNoteText: { fontSize: 12, color: "#D97706", fontWeight: "500" },

  // Location
  detectBtn: { flexDirection: "row", alignItems: "center" },
  detectText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  inputBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.gray200,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputIcon: { marginRight: 10, marginTop: 2 },
  input: { flex: 1, fontSize: 14, color: Colors.black, padding: 0 },
  noteInput: { minHeight: 72 },
  coordsText: { fontSize: 11, color: Colors.gray400, marginTop: 8, marginLeft: 4 },

  // Summary
  summaryCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1.5, borderColor: Colors.gray200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: Colors.black, marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryKey: { fontSize: 13, color: Colors.gray600 },
  summaryVal: { fontSize: 13, fontWeight: "600", color: Colors.black },
  summaryDivider: { height: 1, backgroundColor: Colors.gray100, marginVertical: 10 },
  summaryTotal: { fontSize: 15, fontWeight: "700", color: Colors.black },
  summaryTotalVal: { fontSize: 16, fontWeight: "800", color: Colors.primary },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: "800" },
});
