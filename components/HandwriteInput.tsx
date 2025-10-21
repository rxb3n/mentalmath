import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props {
  size: number;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

type Point = { x: number; y: number };

type Template = { name: string; points: Point[] };

const USER_TEMPLATES_KEY = "@handwrite_user_templates_v1";

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pathLength(points: Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distance(points[i - 1], points[i]);
  return d;
}

function centroid(points: Point[]): Point {
  const c = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: c.x / points.length, y: c.y / points.length };
}

function indicativeAngle(points: Point[]): number {
  const c = centroid(points);
  return Math.atan2(c.y - points[0].y, c.x - points[0].x);
}

function rotateBy(points: Point[], angle: number): Point[] {
  const c = centroid(points);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((p) => ({
    x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
    y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
  }));
}

function boundingBox(points: Point[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function scaleToSquare(points: Point[], size: number = 250, keepRatio = true): Point[] {
  const box = boundingBox(points);
  const scaled = points.map((p) => ({
    x: (p.x - box.x) * (size / (keepRatio ? Math.max(box.width, box.height) || 1 : box.width || 1)),
    y: (p.y - box.y) * (size / (keepRatio ? Math.max(box.width, box.height) || 1 : box.height || 1)),
  }));
  const c = centroid(scaled);
  return scaled.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

function resample(points: Point[], n: number = 64): Point[] {
  const I = pathLength(points) / (n - 1);
  let D = 0;
  const newPoints: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    if ((D + d) >= I) {
      const t = (I - D) / d;
      const nx = points[i - 1].x + t * (points[i].x - points[i - 1].x);
      const ny = points[i - 1].y + t * (points[i].y - points[i - 1].y);
      const q = { x: nx, y: ny };
      newPoints.push(q);
      points.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }
  if (newPoints.length === n - 1) newPoints.push(points[points.length - 1]);
  return newPoints.slice(0, n);
}

function pathDistance(a: Point[], b: Point[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += distance(a[i], b[i]);
  return d / a.length;
}

function normalize(points: Point[]): Point[] {
  let pts = resample(points.map((p) => ({ x: p.x, y: p.y })), 64);
  const angle = indicativeAngle(pts);
  pts = rotateBy(pts, -angle);
  pts = scaleToSquare(pts, 200, true);
  return pts;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M${first.x},${first.y}` + rest.map((p) => ` L${p.x},${p.y}`).join("");
}

function buildDigitTemplates(): Template[] {
  const mk = (name: string, pts: Point[]): Template => ({ name, points: normalize(pts) });
  const line = (x1: number, y1: number, x2: number, y2: number, steps = 20): Point[] => {
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
    return pts;
  };
  const circle = (cx: number, cy: number, r: number, steps = 40): Point[] => {
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
    return pts;
  };

  const templates: Template[] = [];

  templates.push(mk("0", circle(50, 50, 40)));
  templates.push(mk("1", line(50, 10, 50, 90)));
  templates.push(mk("1", [ {x:30,y:20}, {x:50,y:10}, {x:50,y:90} ]));
  templates.push(mk("2", [
    ...line(10,20,90,20), ...line(90,20,50,50), ...line(50,50,10,90), ...line(10,90,90,90)
  ]));
  templates.push(mk("3", [
    ...line(20,20,80,20), ...line(80,20,50,50), ...line(50,50,80,80), ...line(80,80,20,80)
  ]));
  templates.push(mk("4", [ ...line(70,10,70,90), ...line(20,50,80,50), ...line(20,10,70,90) ]));
  templates.push(mk("4", [ ...line(70,10,70,90), ...line(20,50,80,50) ]));
  templates.push(mk("5", [ ...line(80,20,20,20), ...line(20,20,20,50), ...line(20,50,80,50), ...line(80,50,80,90), ...line(80,90,20,90) ]));
  templates.push(mk("6", [ ...circle(55,55,35), ...line(55,55,20,80) ]));
  templates.push(mk("7", [ ...line(10,20,90,20), ...line(90,20,40,90) ]));
  templates.push(mk("7", [ ...line(10,20,90,20), ...line(90,20,60,60), ...line(60,60,50,90) ]));
  templates.push(mk("8", [ ...circle(50,35,18), ...circle(50,70,22) ]));
  templates.push(mk("9", [ ...circle(50,40,25), ...line(60,55,70,90) ]));
  templates.push(mk("9", [ ...circle(50,40,25), ...line(50,55,50,90) ]));

  return templates;
}

function recognizeDigit(rawPoints: Point[], templates: Template[]): { digit: string; score: number } {
  const pts = normalize(rawPoints);
  let bestScore = -Infinity;
  let best = "";
  const diagonal = Math.hypot(200, 200);
  for (const t of templates) {
    const d = pathDistance(pts, t.points);
    const score = 1 - d / (0.5 * diagonal);
    if (score > bestScore) {
      bestScore = score;
      best = t.name;
    }
  }
  return { digit: best, score: bestScore };
}

export default function HandwriteInput({ size, value, onChangeText, onSubmit }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const recognizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibDigitIdx, setCalibDigitIdx] = useState<number>(0);
  const [calibSampleCount, setCalibSampleCount] = useState<number>(0);
  const digits: string[] = useMemo(() => ["0","1","2","3","4","5","6","7","8","9"], []);

  const baseTemplates = useMemo(() => buildDigitTemplates(), []);
  const templates = useMemo(() => [...baseTemplates, ...userTemplates], [baseTemplates, userTemplates]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_TEMPLATES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Template[];
          if (Array.isArray(parsed)) setUserTemplates(parsed);
          setIsCalibrating(false);
        } else {
          setIsCalibrating(true);
        }
      } catch (e) {
        console.log("calibration load error", e);
        setIsCalibrating(true);
      }
    })();
  }, []);

  const clearTimers = () => {
    if (recognizeTimer.current) clearTimeout(recognizeTimer.current);
    if (submitTimer.current) clearTimeout(submitTimer.current);
  };

  const commitCalibrationSample = async () => {
    if (points.length < 8) return;
    const digit = digits[calibDigitIdx] ?? "";
    if (!digit) return;
    const norm = normalize(points);
    const tpl: Template = { name: digit, points: norm };
    setUserTemplates((prev) => [...prev, tpl]);
    setPaths([]);
    setPoints([]);
    const nextSample = calibSampleCount + 1;
    const neededPerDigit = 2;
    if (nextSample >= neededPerDigit) {
      const nextDigit = calibDigitIdx + 1;
      setCalibSampleCount(0);
      if (nextDigit >= digits.length) {
        setIsCalibrating(false);
        try {
          const toStore = [...userTemplates, tpl];
          await AsyncStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(toStore));
        } catch (e) {
          console.log("calibration save error", e);
        }
      } else {
        setCalibDigitIdx(nextDigit);
      }
    } else {
      setCalibSampleCount(nextSample);
    }
  };

  const schedule = () => {
    clearTimers();

    if (isCalibrating) {
      submitTimer.current = setTimeout(() => {
        commitCalibrationSample();
      }, 500);
      return;
    }

    recognizeTimer.current = setTimeout(() => {
      if (points.length >= 8) {
        const { digit, score } = recognizeDigit(points, templates);
        if (digit && score > 0.6) {
          onChangeText(value + digit);
          setPaths([]);
          setPoints([]);
        }
      }
    }, 250);

    submitTimer.current = setTimeout(() => {
      let nextValue = value;
      if (points.length >= 8) {
        const { digit, score } = recognizeDigit(points, templates);
        if (digit && score > 0.6) {
          nextValue = value + digit;
          onChangeText(nextValue);
        }
      }
      if (nextValue.length > 0) {
        setPaths([]);
        setPoints([]);
        onSubmit();
      }
    }, 500);
  };

  const hasStartedRef = useRef<boolean>(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!hasStartedRef.current) {
          hasStartedRef.current = true;
          console.log("handwrite: start detecting input");
        }
        const { locationX, locationY } = evt.nativeEvent;
        const p: Point = { x: locationX, y: locationY };
        setPoints((prev) => [...prev, p]);
        setPaths((prev) => [...prev, `M${locationX},${locationY}`]);
        schedule();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const p: Point = { x: locationX, y: locationY };
        setPoints((prev) => [...prev, p]);
        setPaths((prev) => {
          const arr = [...prev];
          const last = arr[arr.length - 1] ?? "";
          arr[arr.length - 1] = last + ` L${locationX},${locationY}`;
          return arr;
        });
        schedule();
      },
      onPanResponderRelease: () => {
        schedule();
      },
      onPanResponderTerminate: () => {
        schedule();
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const resetCalibration = async () => {
    try {
      await AsyncStorage.removeItem(USER_TEMPLATES_KEY);
    } catch {}
    setUserTemplates([]);
    setIsCalibrating(true);
    setCalibDigitIdx(0);
    setCalibSampleCount(0);
    setPaths([]);
    setPoints([]);
  };

  return (
    <View style={{ alignItems: "center" }}>
      <View
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
        {isCalibrating && (
          <View style={styles.calibOverlay} pointerEvents="none" testID="calibration-overlay">
            <Text style={styles.calibTitle}>Calibration</Text>
            <Text style={styles.calibText}>Draw the digit</Text>
            <Text style={styles.calibDigit}>{digits[calibDigitIdx]}</Text>
            <Text style={styles.calibProgress}>{calibSampleCount + 1}/2</Text>
          </View>
        )}
      </View>

      <View style={styles.answerRow}>
        <Text style={styles.answerLabel}>Your answer</Text>
        <Text style={styles.answerValue} testID="answer-value">{value || "_"}</Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity onPress={resetCalibration} style={styles.linkBtn} testID="reset-calibration">
          <Text style={styles.linkText}>Recalibrate</Text>
        </TouchableOpacity>
        {!isCalibrating && (
          <TouchableOpacity
            onPress={() => setIsCalibrating(true)}
            style={styles.linkBtn}
            testID="start-calibration"
          >
            <Text style={styles.linkText}>Calibrate</Text>
          </TouchableOpacity>
        )}
      </View>
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
  calibOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  calibTitle: {
    fontSize: 18,
    color: "#333",
    fontWeight: "700" as const,
  },
  calibText: {
    fontSize: 14,
    color: "#666",
  },
  calibDigit: {
    fontSize: 56,
    fontWeight: "700" as const,
    color: "#333",
    letterSpacing: 2,
  },
  calibProgress: {
    fontSize: 12,
    color: "#999",
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  linkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkText: {
    color: "#666",
    fontSize: 12,
  },
});
