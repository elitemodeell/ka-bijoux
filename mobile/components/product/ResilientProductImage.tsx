import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

import { Colors } from "@/constants/theme";

type Props = {
  sources: Array<string | null | undefined>;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover";
  compact?: boolean;
  accessibilityLabel?: string;
};

export function ResilientProductImage({
  sources,
  style,
  placeholderStyle,
  contentFit = "contain",
  compact = false,
  accessibilityLabel,
}: Props) {
  const candidates = useMemo(
    () => [...new Set(sources.filter((source): source is string => Boolean(source?.trim())))],
    [sources.join("|")],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [candidates.join("|")]);

  const uri = candidates[candidateIndex];

  return (
    <View style={[styles.frame, style as StyleProp<ViewStyle>]}>
      <View style={[StyleSheet.absoluteFill, styles.placeholder, placeholderStyle]}>
        <Image
          source={require("../../assets/icon.png")}
          style={compact ? styles.logoCompact : styles.logo}
          contentFit="contain"
          accessibilityElementsHidden
        />
        {!compact ? <Text style={styles.brand}>KA Bijoux</Text> : null}
      </View>
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, !loaded && styles.hidden]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          transition={160}
          accessibilityLabel={accessibilityLabel}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (candidateIndex + 1 < candidates.length) {
              setCandidateIndex((current) => current + 1);
              setLoaded(false);
            } else {
              setLoaded(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", backgroundColor: "#fff7fa" },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff4f8",
    borderColor: "#fce7f3",
  },
  logo: { width: 54, height: 54, opacity: 0.72 },
  logoCompact: { width: 30, height: 30, opacity: 0.66 },
  brand: { marginTop: 6, color: Colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  hidden: { opacity: 0 },
});
