import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props {
  size: number;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCalibrationChange?: (isCalibrating: boolean) => void;
  onFirstInput?: () => void;
  renderCalibrationOverlay?: boolean;
  calibrationMode?: boolean;
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
  const denom = keepRatio ? Math.max(box.width, box.height) || 1 : (box.width || 1);
  const scaled = points.map((p) => ({
    x: (p.x - box.x) * (size / denom),
    y: (p.y - box.y) * (size / (keepRatio ? denom : (box.height || 1))),
  }));
  const c = centroid(scaled);
  return scaled.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

function resample(points: Point[], n: number = 64): Point[] {
  const pts = points.slice();
  const I = pathLength(pts) / (n - 1);
  let D = 0;
  const newPoints: Point[] = [pts[0]];
  let i = 1;
  while (i < pts.length) {
    const d = distance(pts[i - 1], pts[i]);
    if (D + d >= I) {
      const t = (I - D) / d;
      const nx = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
      const ny = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
      const q = { x: nx, y: ny };
      newPoints.push(q);
      pts.splice(i, 0, q);
      D = 0;
      i++;
    } else {
      D += d;
      i++;
    }
  }
  if (newPoints.length < n) newPoints.push(pts[pts.length - 1]);
  return newPoints.slice(0, n);
}

function pathDistance(a: Point[], b: Point[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += distance(a[i], b[i]);
  return d / a.length;
}

function smooth(points: Point[], window: number = 3): Point[] {
  if (points.length <= window) return points;
  const half = Math.floor(window / 2);
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    let sx = 0, sy = 0, c = 0;
    for (let j = i - half; j <= i + half; j++) {
      const k = Math.max(0, Math.min(points.length - 1, j));
      sx += points[k].x; sy += points[k].y; c++;
    }
    out.push({ x: sx / c, y: sy / c });
  }
  return out;
}

function normalize(points: Point[]): Point[] {
  let pts = points.map((p) => ({ x: p.x, y: p.y }));
  const box = boundingBox(pts);
  if (box.width < 5 && box.height < 5) return pts;
  pts = smooth(pts, 3);
  pts = resample(pts, 64);
  const angle = indicativeAngle(pts);
  pts = rotateBy(pts, -angle);
  pts = scaleToSquare(pts, 200, true);
  return pts;
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
  if (pts.length === 0) return { digit: "", score: -Infinity };
  let bestScore = -Infinity;
  let best = "";
  const diagonal = Math.hypot(200, 200);
  for (const t of templates) {
    const d = pathDistance(pts, t.points);
    const score = 1 - d / (0.35 * diagonal);
    if (score > bestScore) {
      bestScore = score;
      best = t.name;
    }
  }
  return { digit: best, score: bestScore };
}

export default function HandwriteInput({ size, value, onChangeText, onSubmit, onCalibrationChange, onFirstInput, renderCalibrationOverlay = true, calibrationMode = false }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibDigitIdx, setCalibDigitIdx] = useState<number>(0);
  const [calibSampleCount, setCalibSampleCount] = useState<number>(0);
  const calibDigitIdxRef = useRef<number>(0);
  const calibSampleCountRef = useRef<number>(0);
  const digits: string[] = useMemo(() => ["0","1","2","3","4","5","6","7","8","9"], []);

  const baseTemplates = useMemo(() => buildDigitTemplates(), []);
  const templates = useMemo(() => [...baseTemplates, ...userTemplates], [baseTemplates, userTemplates]);

  const valueRef = useRef<string>(value);
  const pointsRef = useRef<Point[]>(points);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { calibDigitIdxRef.current = calibDigitIdx; }, [calibDigitIdx]);
  useEffect(() => { calibSampleCountRef.current = calibSampleCount; }, [calibSampleCount]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_TEMPLATES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Template[];
          if (Array.isArray(parsed)) setUserTemplates(parsed);
        }
      } catch (e) {
        console.log("calibration load error", e);
      }
    })();
  }, []);

  useEffect(() => {
    setIsCalibrating(calibrationMode);
    onCalibrationChange?.(calibrationMode);
  }, [calibrationMode, onCalibrationChange]);

  const clearTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  const commitCalibrationSample = async () => {
    if (pointsRef.current.length < 8) { console.log("calibration: too few points, ignoring sample", pointsRef.current.length); return; }
    const digit = digits[calibDigitIdxRef.current] ?? "";
    if (!digit) return;
    const norm = normalize(pointsRef.current);
    const tpl: Template = { name: digit, points: norm };
    console.log("calibration: saving sample", { digit, sample: calibSampleCountRef.current + 1, points: pointsRef.current.length });
    setUserTemplates((prev) => {
      const updated = [...prev, tpl];
      AsyncStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(updated)).catch((e) => console.log("calibration save error", e));
      return updated;
    });
    setPaths([]);
    setPoints([]);

    const neededPerDigit = 2;
    const nextSample = calibSampleCountRef.current + 1;
    if (nextSample >= neededPerDigit) {
      const nextDigit = calibDigitIdxRef.current + 1;
      setCalibSampleCount(0);
      calibSampleCountRef.current = 0;
      if (nextDigit >= digits.length) {
        console.log("calibration: completed");
        setIsCalibrating(false);
        onCalibrationChange?.(false);
      } else {
        console.log("calibration: next digit", digits[nextDigit]);
        setCalibDigitIdx(nextDigit);
        calibDigitIdxRef.current = nextDigit;
      }
    } else {
      setCalibSampleCount(nextSample);
      calibSampleCountRef.current = nextSample;
    }
  };

  const schedule = () => {
    clearTimer();

    console.log("handwrite: schedule inactivity submit in 500ms");

    inactivityTimer.current = setTimeout(() => {
      console.log("handwrite: inactivity timer fired", { isCalibrating });
      if (isCalibrating) {
        commitCalibrationSample();
        return;
      }

      const prevLen = valueRef.current.length;
      let nextValue = valueRef.current;
      const pts = pointsRef.current;
      const box = boundingBox(pts);
      const tooSmall = (box.width < 6 && box.height < 6) || pts.length < 8;
      if (!tooSmall) {
        const { digit, score } = recognizeDigit(pts, templates);
        console.log("recognizeDigit:", { digit, score, pts: pts.length, box });
        if (digit && score > 0.15) {
          nextValue = valueRef.current + digit;
          onChangeText(nextValue);
        }
      }

      setPaths([]);
      setPoints([]);

      if (nextValue.length > prevLen) {
        setTimeout(() => {
          console.log("handwrite: calling onSubmit()");
          onSubmit();
        }, 0);
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
          onFirstInput?.();
          console.log("handwrite: start detecting input");
        }
        const { locationX, locationY } = evt.nativeEvent;
        console.log("handwrite: grant", { x: locationX, y: locationY });
        const p: Point = { x: locationX, y: locationY };
        setPoints((prev) => [...prev, p]);
        setPaths((prev) => [...prev, `M${locationX},${locationY}`]);
        schedule();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (pointsRef.current.length % 10 === 0) {
          console.log("handwrite: move", { x: locationX, y: locationY });
        }
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

  const resetCalibration = async () => {
    try {
      await AsyncStorage.removeItem(USER_TEMPLATES_KEY);
    } catch {}
    setUserTemplates([]);
    setIsCalibrating(calibrationMode);
    onCalibrationChange?.(calibrationMode);
    setCalibDigitIdx(0);
    setCalibSampleCount(0);
    calibDigitIdxRef.current = 0;
    calibSampleCountRef.current = 0;
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
        {isCalibrating && renderCalibrationOverlay && (
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

      {calibrationMode && (
        <View style={styles.row}>
          <TouchableOpacity onPress={resetCalibration} style={styles.linkBtn} testID="reset-calibration">
            <Text style={styles.linkText}>Reset calibration</Text>
          </TouchableOpacity>
          {!isCalibrating && (
            <TouchableOpacity
              onPress={() => setIsCalibrating(true)}
              style={styles.linkBtn}
              testID="start-calibration"
            >
              <Text style={styles.linkText}>Start calibration</Text>
            </TouchableOpacity>
          )}
        </View>
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
