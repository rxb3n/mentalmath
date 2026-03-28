import { Trophy } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLeaderboard } from "@/contexts/LeaderboardContext";

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { getTopScores, isLoading } = useLeaderboard();
  
  const topScores = getTopScores(5);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Trophy size={60} color="#333" strokeWidth={1.5} />
          <Text style={styles.title}>Top IQ Scores</Text>
          <Text style={styles.subtitle}>Your Best Performances</Text>
        </View>

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : topScores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No scores yet</Text>
            <Text style={styles.emptySubtext}>Play a game to set your first score!</Text>
          </View>
        ) : (
          <View style={styles.leaderboardList}>
            {topScores.map((entry, index) => {
              const date = new Date(entry.date);
              const dateStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <View key={entry.id} style={styles.leaderboardItem}>
                  <View style={styles.rankContainer}>
                    <View style={[
                      styles.rankBadge,
                      index === 0 && styles.rankBadgeGold,
                      index === 1 && styles.rankBadgeSilver,
                      index === 2 && styles.rankBadgeBronze,
                    ]}>
                      <Text style={[
                        styles.rankText,
                        index <= 2 && styles.rankTextTop,
                      ]}>
                        {index + 1}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.scoreInfo}>
                    <Text style={styles.iqScore}>{entry.iq} IQ</Text>
                    <Text style={styles.dateText}>{dateStr}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f0",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "300" as const,
    color: "#333",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    color: "#999",
    fontWeight: "500" as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bbb",
    marginTop: 8,
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  rankContainer: {
    width: 50,
    alignItems: "center",
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeGold: {
    backgroundColor: "#ffd700",
  },
  rankBadgeSilver: {
    backgroundColor: "#c0c0c0",
  },
  rankBadgeBronze: {
    backgroundColor: "#cd7f32",
  },
  rankText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#666",
  },
  rankTextTop: {
    color: "#fff",
  },
  scoreInfo: {
    flex: 1,
  },
  iqScore: {
    fontSize: 28,
    fontWeight: "600" as const,
    color: "#333",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
});
