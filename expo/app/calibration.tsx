import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import HandwriteInput from "@/components/HandwriteInput";

export default function CalibrationScreen() {
  const insets = useSafeAreaInsets();
  const [val, setVal] = useState<string>("");

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Input</Text>
        <Text style={styles.subtitle}>Test your handwriting keyboard input</Text>
      </View>

      <View style={styles.center}>
        <HandwriteInput
          size={320}
          value={val}
          onChangeText={(t) => {
            console.log("test screen: value updated", t);
            setVal(t);
          }}
          onSubmit={() => {
            console.log("test screen: submit called");
          }}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setVal("")} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f0", paddingHorizontal: 20 },
  header: { alignItems: "center", paddingVertical: 16, gap: 6 },
  title: { fontSize: 28, fontWeight: "700" as const, color: "#333" },
  subtitle: { fontSize: 14, color: "#666" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  footer: { alignItems: "center", paddingVertical: 16, gap: 12 },
  clearBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  clearText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#666",
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    color: "#999",
  },
});
