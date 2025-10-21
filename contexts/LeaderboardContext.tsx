import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface LeaderboardEntry {
  id: string;
  iq: number;
  date: number;
}

const LEADERBOARD_KEY = "@brain_game_leaderboard";

export const [LeaderboardProvider, useLeaderboard] = createContextHook(() => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const stored = await AsyncStorage.getItem(LEADERBOARD_KEY);
      if (stored) {
        setLeaderboard(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addScore = useCallback(async (iq: number) => {
    try {
      const newEntry: LeaderboardEntry = {
        id: Date.now().toString(),
        iq,
        date: Date.now(),
      };

      setLeaderboard((prev) => {
        const updated = [...prev, newEntry]
          .sort((a, b) => b.iq - a.iq)
          .slice(0, 50);
        
        AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated)).catch((error) => {
          console.error("Failed to save score:", error);
        });
        
        return updated;
      });
    } catch (error) {
      console.error("Failed to save score:", error);
    }
  }, []);

  const getTopScores = useCallback((count: number = 5): LeaderboardEntry[] => {
    return leaderboard.slice(0, count);
  }, [leaderboard]);

  return useMemo(() => ({
    leaderboard,
    isLoading,
    addScore,
    getTopScores,
  }), [leaderboard, isLoading, addScore, getTopScores]);
});
