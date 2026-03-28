import React, { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface DrawingCanvasProps {
  onDrawingComplete: (svgData: string) => void;
  width: number;
  height: number;
}

export default function DrawingCanvas({ onDrawingComplete, width, height }: DrawingCanvasProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef<string>("");
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleSubmit = () => {
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    submitTimeoutRef.current = setTimeout(() => {
      setPaths((currentPaths) => {
        const svgData = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${currentPaths
          .map(
            (p) =>
              `<path d="${p}" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          )
          .join("")}</svg>`;
        onDrawingComplete(svgData);
        return currentPaths;
      });
    }, 1200);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M${locationX},${locationY}`;
        setPaths((prev) => [...prev, currentPath.current]);
        scheduleSubmit();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L${locationX},${locationY}`;
        setPaths((prev) => {
          const newPaths = [...prev];
          newPaths[newPaths.length - 1] = currentPath.current;
          return newPaths;
        });
        scheduleSubmit();
      },
      onPanResponderRelease: () => {
        currentPath.current = "";
        scheduleSubmit();
      },
      onPanResponderTerminate: () => {
        currentPath.current = "";
        scheduleSubmit();
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { width, height }]} {...panResponder.panHandlers} testID="drawing-canvas">
      <Svg width={width} height={height}>
        {paths.map((path, index) => (
          <Path
            key={index}
            d={path}
            stroke="#333"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
});
