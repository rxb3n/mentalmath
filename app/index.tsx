import { router } from "expo-router";
import { Brain, Settings, Trophy } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Brain size={80} color="#333" strokeWidth={1.5} />
        <Text style={styles.title}>Brain Age</Text>
        <Text style={styles.subtitle}>Mental Math Training</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => router.push("/game")}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>Start Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/calibration")}
          activeOpacity={0.8}
        >
          <Settings size={22} color="#666" />
          <Text style={styles.secondaryButtonText}>Calibration</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/leaderboard")}
          activeOpacity={0.8}
        >
          <Trophy size={22} color="#666" />
          <Text style={styles.secondaryButtonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Draw your answers with your finger</Text>
        <Text style={styles.instructionText}>30 seconds to start • +2s per correct answer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f0",
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: "300" as const,
    color: "#333",
    marginTop: 20,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    letterSpacing: 1,
  },
  buttonContainer: {
    gap: 16,
  },
  playButton: {
    backgroundColor: "#333",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  playButtonText: {
    fontSize: 24,
    fontWeight: "600" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "500" as const,
    color: "#666",
  },
  instructions: {
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
