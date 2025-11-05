import React, { useRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  size: number;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onFirstInput?: () => void;
}

export default function HandwriteInput({ size, value, onChangeText, onSubmit, onFirstInput }: Props) {
  const inputRef = useRef<TextInput>(null);
  const hasStartedRef = useRef<boolean>(false);

  const handleChangeText = (text: string) => {
    if (!hasStartedRef.current && text.length > 0) {
      hasStartedRef.current = true;
      onFirstInput?.();
    }
    
    const filtered = text.replace(/[^0-9]/g, '');
    onChangeText(filtered);
  };

  return (
    <View style={{ alignItems: "center" }}>
      <View style={[styles.inputContainer, { width: size, minHeight: size }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          onSubmitEditing={onSubmit}
          keyboardType="number-pad"
          placeholder="Tap to write answer"
          placeholderTextColor="#ccc"
          returnKeyType="done"
          autoFocus={false}
          multiline={false}
          testID="handwrite-input"
        />
      </View>

      <View style={styles.answerRow}>
        <Text style={styles.answerLabel}>Your answer</Text>
        <Text style={styles.answerValue} testID="answer-value">{value || "_"}</Text>
      </View>

      <Text style={styles.hintText}>Use handwriting mode on your keyboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#333",
    textAlign: "center",
    width: "100%",
    letterSpacing: 4,
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
  hintText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});
