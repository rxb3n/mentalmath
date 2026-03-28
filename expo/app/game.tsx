import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLeaderboard } from "@/contexts/LeaderboardContext";
import HandwriteInput from "@/components/HandwriteInput";

type Operation = "+" | "-" | "×";

interface MathProblem {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
}

function generateProblem(): MathProblem {
  const operations: Operation[] = ["+", "-", "×"];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let num1 = Math.floor(Math.random() * 11);
  let num2 = Math.floor(Math.random() * 11);

  if (operation === "-") {
    if (num2 > num1) {
      [num1, num2] = [num2, num1];
    }
  }

  let answer: number;
  switch (operation) {
    case "+":
      answer = num1 + num2;
      break;
    case "-":
      answer = num1 - num2;
      break;
    case "×":
      answer = num1 * num2;
      break;
  }

  return { num1, num2, operation, answer };
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { addScore } = useLeaderboard();

  const [problems, setProblems] = useState<MathProblem[]>(() => [generateProblem(), generateProblem()]);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [answerBuffer, setAnswerBuffer] = useState<string>("");
  const answerRef = useRef<string>("");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [canvasKey, setCanvasKey] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  const activeProblem = problems[0];

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const listShift = useRef(new Animated.Value(0)).current;

  const handleGameOver = useCallback(() => {
    setGameOver(true);
  }, []);

  useEffect(() => {
    if (gameOver || !hasStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, hasStarted, handleGameOver]);

  useEffect(() => {
    if (!gameOver) return;
    addScore(score).catch((e) => console.log("addScore error", e));
  }, [gameOver, score, addScore]);

  const playWrongAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playCorrectAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const scrollProblems = useCallback(() => {
    Animated.timing(listShift, {
      toValue: -1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setProblems((prev) => {
        const next = [...prev];
        next.shift();
        next.push(generateProblem());
        return next;
      });
      listShift.setValue(0);
    });
  }, [listShift]);

  const submitAnswer = useCallback(() => {
    if (isProcessing || gameOver) return;
    setIsProcessing(true);
    try {
      const buf = answerRef.current;
      console.log("submitAnswer called with:", buf);
      const recognizedNumber = parseInt(buf);
      const isCorrect = !isNaN(recognizedNumber) && recognizedNumber === activeProblem.answer;
      if (isCorrect) {
        playCorrectAnimation();
        setScore((prev) => prev + 1);
        setTimeLeft((prev) => prev + 2);
      } else {
        playWrongAnimation();
      }
      setAnswerBuffer("");
      answerRef.current = "";
      setCanvasKey((prev) => prev + 1);
      scrollProblems();
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, gameOver, activeProblem.answer, scrollProblems, playCorrectAnimation, playWrongAnimation]);

  if (gameOver) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="gameOver-screen">
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.gameOverSubtitle}>Your Brain Age IQ</Text>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Text style={styles.finalScore}>{score}</Text>
          </Animated.View>

          <View style={styles.gameOverButtons}>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => {
                setScore(0);
                setTimeLeft(30);
                setGameOver(false);
                setProblems([generateProblem(), generateProblem()]);
                setCanvasKey((prev) => prev + 1);
              }}
              activeOpacity={0.8}
              testID="playAgain-button"
            >
              <Text style={styles.playAgainButtonText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
              testID="home-button"
            >
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="game-screen">
      <View style={styles.header}>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>IQ</Text>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text style={styles.statValue}>{score}</Text>
            </Animated.View>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={[styles.statValue, timeLeft <= 10 ? styles.lowTime : undefined]}>
              {timeLeft}s
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} testID="close-button">
          <X size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.problemListContainer}>
        <Animated.View
          style={{
            transform: [
              {
                translateY: listShift.interpolate({
                  inputRange: [-1, 0],
                  outputRange: [-80, 0],
                }),
              },
              { translateX: shakeAnim },
            ],
          }}
        >
          {[0, 1].map((i) => {
            const p = problems[i];
            if (!p) return null;
            const opacity = i === 0 ? 1 : 0.3;
            return (
              <View key={`problem-${i}-${p.num1}-${p.operation}-${p.num2}`} style={styles.problemRow}>
                <Text style={[styles.problem, { opacity }]}>
                  {p.num1} {p.operation} {p.num2} = ?
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.canvasContainer}>
        <Text style={styles.canvasLabel}>Type your answer using handwriting keyboard</Text>
        <View style={styles.canvasWrapper}>
          <HandwriteInput
            key={canvasKey}
            size={280}
            value={answerBuffer}
            onChangeText={(t) => {
              console.log("answerBuffer update:", t);
              setAnswerBuffer(t);
              answerRef.current = t;
            }}
            onSubmit={submitAnswer}
            onFirstInput={() => setHasStarted(true)}
          />
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#333" />
              <Text style={styles.processingText}>Checking...</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitAnswer}
          disabled={!answerBuffer || isProcessing}
          activeOpacity={0.8}
        >
          <Text style={[styles.submitButtonText, (!answerBuffer || isProcessing) && styles.disabledText]}>
            Submit Answer
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f0",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
  },
  stats: {
    flexDirection: "row",
    gap: 32,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500" as const,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "600" as const,
    color: "#333",
    marginTop: 4,
  },
  lowTime: {
    color: "#e74c3c",
  },
  closeButton: {
    padding: 8,
  },
  problemListContainer: {
    alignItems: "center",
    paddingVertical: 24,
    height: 120,
    overflow: "hidden",
  },
  problemRow: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  problem: {
    fontSize: 64,
    fontWeight: "700" as const,
    color: "#333",
    letterSpacing: 1,
  },
  canvasContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  canvasLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500" as const,
  },
  canvasWrapper: {
    position: "relative",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#333",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
    textAlign: "center",
  },
  disabledText: {
    opacity: 0.4,
  },
  gameOverContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  gameOverTitle: {
    fontSize: 48,
    fontWeight: "300" as const,
    color: "#333",
  },
  gameOverSubtitle: {
    fontSize: 16,
    color: "#999",
    letterSpacing: 1,
  },
  finalScore: {
    fontSize: 120,
    fontWeight: "700" as const,
    color: "#333",
    marginVertical: 20,
  },
  gameOverButtons: {
    gap: 12,
    width: "100%",
    paddingHorizontal: 40,
  },
  playAgainButton: {
    backgroundColor: "#333",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  playAgainButtonText: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "#fff",
  },
  homeButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  homeButtonText: {
    fontSize: 18,
    fontWeight: "500" as const,
    color: "#666",
  },
});