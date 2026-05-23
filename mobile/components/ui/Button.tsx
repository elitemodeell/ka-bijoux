import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Colors, BorderRadius, FontSizes } from "@/constants/theme";

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  onPress, label, variant = "primary", size = "md",
  loading = false, disabled = false, style, textStyle, fullWidth,
}: ButtonProps) {
  const sizeStyle = sizes[size];
  const variantStyle = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        disabled && styles.disabled,
        fullWidth && { width: "100%" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : Colors.primary} />
      ) : (
        <Text style={[styles.text, sizeStyle.text, variantStyle.text, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  text: {
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizes = {
  sm: {
    container: { paddingVertical: 8, paddingHorizontal: 16 },
    text: { fontSize: FontSizes.sm },
  },
  md: {
    container: { paddingVertical: 13, paddingHorizontal: 24 },
    text: { fontSize: FontSizes.base },
  },
  lg: {
    container: { paddingVertical: 16, paddingHorizontal: 28 },
    text: { fontSize: FontSizes.md },
  },
};

const variants = {
  primary: {
    container: { backgroundColor: Colors.primary },
    text: { color: "#fff" },
  },
  outline: {
    container: { backgroundColor: "transparent", borderWidth: 2, borderColor: Colors.primary },
    text: { color: Colors.primary },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: { color: Colors.textSecondary },
  },
  danger: {
    container: { backgroundColor: Colors.error },
    text: { color: "#fff" },
  },
};
