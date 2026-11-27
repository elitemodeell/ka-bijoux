import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { setAudioModeAsync, useAudioPlayer, type AudioSource } from "expo-audio";
import { SeasonalAudioPlayback } from "./seasonalAudioPlayback";

const PREFERENCE_KEY = "ka-seasonal-music-enabled-v1";
const DEFAULT_TRACK = require("../../assets/audio/jingle-bells-music-box-wavemaster-175881.mp3");
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";

function absoluteAudioUrl(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}

class AudioControlBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SeasonalAudioControlInner({
  available,
  url,
  volume = 0.08,
}: {
  available: boolean;
  url?: string | null;
  volume?: number;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const enabledRef = useRef<boolean | null>(null);
  const shouldPlayRef = useRef(false);
  const mountedRef = useRef(false);
  const volumeRef = useRef(volume);
  const preferenceWriteRef = useRef<Promise<void>>(Promise.resolve());
  volumeRef.current = volume;

  // Keep useAudioPlayer's source constant. Passing null/track conditionally makes
  // expo-audio release and recreate its native SharedObject on each toggle.
  const player = useAudioPlayer(null, { updateInterval: 1000 });
  const source = useMemo<AudioSource>(
    () => (url ? { uri: absoluteAudioUrl(url) } : DEFAULT_TRACK),
    [url],
  );
  const sourceKey = useMemo(
    () => (url ? `remote:${absoluteAudioUrl(url)}` : "bundled:jingle-bells-wavemaster"),
    [url],
  );

  const playbackRef = useRef<SeasonalAudioPlayback | null>(null);
  if (!playbackRef.current) {
    playbackRef.current = new SeasonalAudioPlayback(
      player,
      () => setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
      }),
      () => AppState.currentState === "active",
      () => { if (mountedRef.current) setAudioFailed(true); },
    );
  }
  const playback = playbackRef.current;

  const start = useCallback(() => {
    if (shouldPlayRef.current) void playback.start(sourceKey, source, volumeRef.current);
  }, [playback, source, sourceKey]);
  const stop = useCallback(() => playback.stop(), [playback]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      playback.dispose();
    };
  }, [playback]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PREFERENCE_KEY)
      .then((stored) => {
        if (!active) return;
        const next = stored !== "off";
        enabledRef.current = next;
        setEnabled(next);
      })
      .catch(() => {
        if (!active) return;
        enabledRef.current = true;
        setEnabled(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    shouldPlayRef.current = available && enabled === true;
    if (shouldPlayRef.current) start();
    else stop();
  }, [available, enabled, start, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && shouldPlayRef.current) start();
      else stop();
    });
    return () => subscription.remove();
  }, [start, stop]);

  if (!available) return null;

  const toggle = () => {
    const next = enabledRef.current !== true;
    enabledRef.current = next;
    shouldPlayRef.current = available && next;
    setEnabled(next);
    setAudioFailed(false);
    preferenceWriteRef.current = preferenceWriteRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(PREFERENCE_KEY, next ? "on" : "off"));
    void preferenceWriteRef.current.catch(() => undefined);
  };

  const isPlayingEnabled = enabled === true && !audioFailed;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isPlayingEnabled ? "Desativar mÃºsica natalina" : "Ativar mÃºsica natalina"}
      accessibilityState={{ checked: isPlayingEnabled }}
      hitSlop={6}
      onPress={toggle}
      style={{ width: 30, height: 38, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={isPlayingEnabled ? "volume-high-outline" : "volume-mute-outline"} size={18} color="#fff" />
    </TouchableOpacity>
  );
}

export function SeasonalAudioControl(props: {
  available: boolean;
  url?: string | null;
  volume?: number;
}) {
  return (
    <AudioControlBoundary>
      <SeasonalAudioControlInner {...props} />
    </AudioControlBoundary>
  );
}
