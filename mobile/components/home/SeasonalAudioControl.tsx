import { useEffect } from "react";
import { TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSeasonalAudio } from "./SeasonalAudioProvider";

export function SeasonalAudioControl({
  available,
  url,
  volume = 0.08,
}: {
  available: boolean;
  url?: string | null;
  volume?: number;
}) {
  const { enabled, audioFailed, configure, toggle } = useSeasonalAudio();

  useEffect(() => {
    configure({ available, url, volume });
  }, [available, url, volume, configure]);

  if (!available) return null;

  const isPlayingEnabled = enabled === true && !audioFailed;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isPlayingEnabled ? "Desativar música natalina" : "Ativar música natalina"}
      accessibilityState={{ checked: isPlayingEnabled }}
      hitSlop={6}
      onPress={toggle}
      style={{ width: 30, height: 38, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={isPlayingEnabled ? "volume-high-outline" : "volume-mute-outline"} size={18} color="#fff" />
    </TouchableOpacity>
  );
}
