import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

const PREFERENCE_KEY = "ka-seasonal-music-enabled-v1";
const DEFAULT_TRACK = require("../../assets/audio/ka-jingle-bells-cc0.mp3");
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";

function absoluteAudioUrl(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}

export function SeasonalAudioControl({
  available,
  url,
}: {
  available: boolean;
  url?: string | null;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const source = useMemo(() => {
    if (!available || enabled === false) return null;
    return url ? { uri: absoluteAudioUrl(url) } : DEFAULT_TRACK;
  }, [available, enabled, url]);
  const player = useAudioPlayer(source, { updateInterval: 1000 });
  const shouldPlayRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    fadeTimerRef.current = null;
    player.volume = 0;
    player.pause();
  }, [player]);

  const start = useCallback(async () => {
    if (!shouldPlayRef.current || AppState.currentState !== "active") return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
      });
      player.loop = true;
      player.volume = 0;
      player.play();
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      let step = 0;
      fadeTimerRef.current = setInterval(() => {
        step += 1;
        player.volume = Math.min(0.07, step * 0.01);
        if (step >= 7 && fadeTimerRef.current) {
          clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
      }, 140);
    } catch {
      // Audio playback is optional and must never delay or block the storefront.
      stop();
    }
  }, [player, stop]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PREFERENCE_KEY)
      .then((stored) => { if (active) setEnabled(stored !== "off"); })
      .catch(() => { if (active) setEnabled(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    shouldPlayRef.current = available && enabled === true;
    if (shouldPlayRef.current) void start();
    else stop();
    return () => stop();
  }, [available, enabled, start, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void start();
      else stop();
    });
    return () => subscription.remove();
  }, [start, stop]);

  if (!available) return null;

  const toggle = async () => {
    const next = enabled === false;
    setEnabled(next);
    void AsyncStorage.setItem(PREFERENCE_KEY, next ? "on" : "off").catch(() => undefined);
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={enabled ? "Desativar música natalina" : "Ativar música natalina"}
      accessibilityState={{ checked: enabled === true }}
      hitSlop={6}
      onPress={() => void toggle()}
      style={{ width: 30, height: 38, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={enabled ? "volume-high-outline" : "volume-mute-outline"} size={18} color="#fff" />
    </TouchableOpacity>
  );
}
