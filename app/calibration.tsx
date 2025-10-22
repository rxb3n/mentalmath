import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HandwriteInput from "@/components/HandwriteInput";

export default function CalibrationScreen() {
  const insets = useSafeAreaInsets();
  const [val, setVal] = useState<string>("");

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Calibration</Text>
        <Text style={styles.subtitle}>Draw each prompted digit to teach the recognizer</Text>
      </View>

      <View style={styles.center}>
        <HandwriteInput
          size={320}
          value={val}
          onChangeText={setVal}
          onSubmit={() => setVal("")}
          calibrationMode
          renderCalibrationOverlay
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>When finished, your calibration is saved to this device</Text>
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
  footer: { alignItems: "center", paddingVertical: 16 },
  hint: { fontSize: 12, color: "#999" },
});
