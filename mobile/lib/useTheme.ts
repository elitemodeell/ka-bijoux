import { useColorScheme } from "react-native";
import { LightColors, DarkColors, Shadows, BorderRadius, FontSizes, Spacing } from "@/constants/theme";

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const Colors = isDark ? DarkColors : LightColors;

  return {
    Colors,
    isDark,
    Shadows,
    BorderRadius,
    FontSizes,
    Spacing,
  };
}
