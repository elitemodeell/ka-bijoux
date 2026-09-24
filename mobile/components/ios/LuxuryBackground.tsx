import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/** Decorative iOS-only background. Interactive content is rendered by each screen. */
export function LuxuryBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#fff9f8", "#fff4f7", "#ffe8ef"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <View style={[styles.ribbon, styles.ribbonOne]} />
      <View style={[styles.ribbon, styles.ribbonTwo]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 190, 208, 0.22)",
  },
  glowTop: { width: 310, height: 310, right: -145, top: -125 },
  glowBottom: { width: 390, height: 390, left: -210, bottom: -170 },
  ribbon: {
    position: "absolute",
    height: 160,
    borderWidth: 1,
    borderColor: "rgba(210, 132, 115, 0.28)",
    borderRadius: 999,
    transform: [{ rotate: "-14deg" }],
  },
  ribbonOne: { width: 520, left: -130, bottom: -105 },
  ribbonTwo: { width: 430, right: -220, top: 90, transform: [{ rotate: "28deg" }] },
});
