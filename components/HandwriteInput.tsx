import React, { useEffect, useRef, useState } from "react";
import { PanResponder, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { initializeModel, recognizeDigitFromCanvas, isModelInitialized } from "@/utils/digitRecognition";

interface Props {
  size: number;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onFirstInput?: () => void;
  renderCalibrationOverlay?: boolean;
  calibrationMode?: boolean;
}

export default function HandwriteInput({ size, value, onChangeText, onSubmit, onFirstInput }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const canvasRef = useRef<View>(null);
  const valueRef = useRef<string>(value);
  const hasPathsRef = useRef<boolean>(false);

  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      console.log("TensorFlow.js recognition only works on web");
      setModelError("Recognition only available on web");
      return;
    }

    console.log("Initializing model...");
    initializeModel()
      .then(() => {
        console.log("Model initialized successfully");
        setModelReady(true);
      })
      .catch((error) => {
        console.error("Model initialization failed:", error);
        setModelError("Failed to load recognition model");
      });
  }, []);

  const clearTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  const schedule = () => {
    clearTimer();

    console.log("handwrite: schedule inactivity submit in 1200ms");

    inactivityTimer.current = setTimeout(async () => {
      console.log("handwrite: inactivity timer fired");

      if (!hasPathsRef.current) {
        console.log("handwrite: no paths to recognize");
        return;
      }

      if (!isModelInitialized()) {
        console.warn("Model not ready yet");
        setPaths([]);
        hasPathsRef.current = false;
        return;
      }

      try {
        console.log("handwrite: attempting recognition");
        const result = await recognizeDigitFromCanvas(canvasRef.current);

        if (result && result.digit) {
          console.log("handwrite: recognized digit", result);
          const nextValue = valueRef.current + result.digit;
          onChangeText(nextValue);

          setPaths([]);
          hasPathsRef.current = false;

          setTimeout(() => {
            console.log("handwrite: calling onSubmit()");
            onSubmit();
          }, 0);
        } else {
          console.log("handwrite: no digit recognized");
          setPaths([]);
          hasPathsRef.current = false;
        }
      } catch (error) {
        console.error("Recognition error:", error);
        setPaths([]);
        hasPathsRef.current = false;
      }
    }, 1200);
  };

  const hasStartedRef = useRef<boolean>(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!hasStartedRef.current) {
          hasStartedRef.current = true;
          onFirstInput?.();
          console.log("handwrite: start detecting input");
        }
        const { locationX, locationY } = evt.nativeEvent;
        console.log("handwrite: grant", { x: locationX, y: locationY });
        setPaths((prev) => [...prev, `M${locationX},${locationY}`]);
        hasPathsRef.current = true;
        schedule();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setPaths((prev) => {
          const arr = [...prev];
          const last = arr[arr.length - 1] ?? "";
          arr[arr.length - 1] = last + ` L${locationX},${locationY}`;
          return arr;
        });
        schedule();
      },
      onPanResponderRelease: () => {
        console.log("handwrite: release");
        schedule();
      },
      onPanResponderTerminate: () => {
        console.log("handwrite: terminate");
        schedule();
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return (
    <View style={{ alignItems: "center" }}>
      <View
        ref={canvasRef}
        style={[styles.canvas, { width: size, height: size }]}
        {...panResponder.panHandlers}
        testID="handwrite-canvas"
      >
        <Svg width={size} height={size}>
          <Rect x={0} y={0} width={size} height={size} rx={12} ry={12} fill="#fff" />
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke="#111" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      </View>

      <View style={styles.answerRow}>
        <Text style={styles.answerLabel}>Your answer</Text>
        <Text style={styles.answerValue} testID="answer-value">{value || "_"}</Text>
      </View>

      {!modelReady && Platform.OS === "web" && (
        <Text style={styles.statusText}>Loading recognition model...</Text>
      )}
      {modelError && (
        <Text style={styles.errorText}>{modelError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  answerLabel: {
    fontSize: 14,
    color: "#666",
  },
  answerValue: {
    fontSize: 28,
    fontWeight: "600" as const,
    color: "#333",
    letterSpacing: 2,
  },
  statusText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#e74c3c",
    marginTop: 8,
  },
});
