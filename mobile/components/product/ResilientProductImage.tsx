import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

const imageOrigin = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? "http://127.0.0.1:3000" : "https://kabijoux.com.br");

type Props = {
  sources: Array<string | null | undefined>;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover";
  compact?: boolean;
  accessibilityLabel?: string;
  onImageDimensions?: (width: number, height: number) => void;
};

export function ResilientProductImage({
  sources,
  style,
  placeholderStyle,
  contentFit = "contain",
  accessibilityLabel,
  onImageDimensions,
}: Props) {
  const candidates = useMemo(
    () => [...new Set(sources.filter((source): source is string => Boolean(source?.trim()))
      .map((source) => source.startsWith("/") ? `${imageOrigin.replace(/\/$/, "")}${source}` : source))],
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
      <View style={[StyleSheet.absoluteFill, styles.placeholder, placeholderStyle]} />
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, !loaded && styles.hidden]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          transition={160}
          accessibilityLabel={accessibilityLabel}
          onLoad={(event) => {
            setLoaded(true);
            const { width, height } = event.source;
            if (width > 0 && height > 0) onImageDimensions?.(width, height);
          }}
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
  hidden: { opacity: 0 },
});
