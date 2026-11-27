import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAudioModeAsync, useAudioPlayer, type AudioSource } from "expo-audio";
import { SeasonalAudioPlayback } from "./seasonalAudioPlayback";

const PREFERENCE_KEY = "ka-seasonal-music-enabled-v1";
const DEFAULT_TRACK = require("../../assets/audio/jingle-bells-music-box-wavemaster-175881.mp3");
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";

type AudioConfiguration = {
  available: boolean;
  url?: string | null;
  volume: number;
};

type SeasonalAudioContextValue = {
  enabled: boolean | null;
  audioFailed: boolean;
  configure: (configuration: AudioConfiguration) => void;
  toggle: () => void;
};

const SeasonalAudioContext = createContext<SeasonalAudioContextValue | null>(null);

function absoluteAudioUrl(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}

export function SeasonalAudioProvider({ children }: PropsWithChildren) {
  const [configuration, setConfiguration] = useState<AudioConfiguration>({
    available: false,
    url: null,
    volume: 0.08,
  });
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const enabledRef = useRef<boolean | null>(null);
  const shouldPlayRef = useRef(false);
  const mountedRef = useRef(false);
  const volumeRef = useRef(configuration.volume);
  const preferenceWriteRef = useRef<Promise<void>>(Promise.resolve());
  volumeRef.current = configuration.volume;

  // One native player lives above the authenticated and visitor navigation trees.
  // A Home remount during login can update its configuration, but cannot create a
  // second player or restart playback for an unchanged source.
  const player = useAudioPlayer(null, { updateInterval: 1000 });
  const source = useMemo<AudioSource>(
    () => configuration.url
      ? { uri: absoluteAudioUrl(configuration.url) }
      : DEFAULT_TRACK,
    [configuration.url],
  );
  const sourceKey = useMemo(
    () => configuration.url
      ? `remote:${absoluteAudioUrl(configuration.url)}`
      : "bundled:jingle-bells-wavemaster",
    [configuration.url],
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
    if (shouldPlayRef.current) {
      void playback.start(sourceKey, source, volumeRef.current);
    }
  }, [playback, source, sourceKey]);
  const stop = useCallback(() => playback.stop(), [playback]);

  const configure = useCallback((next: AudioConfiguration) => {
    setConfiguration((current) => (
      current.available === next.available &&
      current.url === next.url &&
      current.volume === next.volume
        ? current
        : next
    ));
  }, []);

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
    shouldPlayRef.current = configuration.available && enabled === true;
    if (shouldPlayRef.current) start();
    else stop();
  }, [configuration.available, enabled, start, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && shouldPlayRef.current) start();
      else stop();
    });
    return () => subscription.remove();
  }, [start, stop]);

  const toggle = useCallback(() => {
    const next = enabledRef.current !== true;
    enabledRef.current = next;
    shouldPlayRef.current = configuration.available && next;
    setEnabled(next);
    setAudioFailed(false);
    preferenceWriteRef.current = preferenceWriteRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(PREFERENCE_KEY, next ? "on" : "off"));
    void preferenceWriteRef.current.catch(() => undefined);
  }, [configuration.available]);

  const value = useMemo(() => ({ enabled, audioFailed, configure, toggle }), [
    enabled,
    audioFailed,
    configure,
    toggle,
  ]);

  return (
    <SeasonalAudioContext.Provider value={value}>
      {children}
    </SeasonalAudioContext.Provider>
  );
}

export function useSeasonalAudio() {
  const context = useContext(SeasonalAudioContext);
  if (!context) throw new Error("SeasonalAudioProvider ausente na navegação raiz.");
  return context;
}
