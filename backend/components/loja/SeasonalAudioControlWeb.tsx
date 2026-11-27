"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFERENCE_KEY = "ka-seasonal-music-enabled-v1";
const DEFAULT_TRACK = "/audio/jingle-bells-music-box-wavemaster-175881.mp3";

type AmbientMusic = {
  enabled: boolean;
  url: string | null;
  volume: number;
};

type StorefrontPresentation = {
  theme?: "christmas" | "default";
  logoUrl?: string;
  ambientMusic?: AmbientMusic;
};

type Props = {
  darkHeader?: boolean;
  onPresentation?: (theme: "christmas" | "default", logoUrl: string) => void;
};

function normalizedVolume(value: number) {
  return Math.min(0.08, Math.max(0, Number.isFinite(value) ? value : 0.08));
}

export default function SeasonalAudioControlWeb({ darkHeader = false, onPresentation }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<AmbientMusic | null>(null);
  const enabledRef = useRef(true);
  const preferenceLoadedRef = useRef(false);
  const [music, setMusic] = useState<AmbientMusic | null>(null);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/storefront/presentation", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o tema da loja.");
        return response.json() as Promise<StorefrontPresentation>;
      })
      .then((payload) => {
        if (!active) return;
        onPresentation?.(payload.theme ?? "default", payload.logoUrl ?? "");
        if (payload.ambientMusic) setMusic(payload.ambientMusic);
      })
      .catch(() => {
        if (active) setMusic({ enabled: false, url: null, volume: 0.08 });
      });

    try {
      setEnabled(window.localStorage.getItem(PREFERENCE_KEY) !== "off");
    } catch {
      setEnabled(true);
    }
    setPreferenceLoaded(true);
    preferenceLoadedRef.current = true;

    return () => { active = false; };
  }, [onPresentation]);

  useEffect(() => {
    musicRef.current = music;
    enabledRef.current = enabled;
  }, [enabled, music]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !music?.enabled) return;
    audio.volume = normalizedVolume(music.volume);
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      // Browsers may block playback until the visitor presses the speaker button.
      setPlaying(false);
    }
  }, [music]);

  useEffect(() => {
    // iOS Safari and some browsers block audible autoplay. Start on the first
    // ordinary user gesture while the saved preference remains enabled.
    const startAfterGesture = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-seasonal-audio-toggle]")) return;
      const config = musicRef.current;
      const audio = audioRef.current;
      if (!config?.enabled || !preferenceLoadedRef.current || !enabledRef.current || !audio || !audio.paused) return;
      audio.volume = normalizedVolume(config.volume);
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    window.addEventListener("pointerdown", startAfterGesture, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", startAfterGesture, true);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!music?.enabled || !preferenceLoaded || !enabled) {
      audio.pause();
      setPlaying(false);
      return;
    }

    void play();
  }, [enabled, music, play, preferenceLoaded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setPlaying(false);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (music?.enabled && enabled) void play();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, music, play]);

  if (!music?.enabled) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (enabled && playing) {
      audio.pause();
      setEnabled(false);
      enabledRef.current = false;
      try { window.localStorage.setItem(PREFERENCE_KEY, "off"); } catch { /* optional preference */ }
      return;
    }

    setEnabled(true);
    enabledRef.current = true;
    try { window.localStorage.setItem(PREFERENCE_KEY, "on"); } catch { /* optional preference */ }
    void play();
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={music.url || DEFAULT_TRACK}
        loop
        preload="none"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={toggle}
        data-seasonal-audio-toggle
        aria-label={enabled ? (playing ? "Desativar música natalina" : "Música ativada; toque para iniciar") : "Ativar música natalina"}
        aria-pressed={enabled}
        title={enabled && !playing ? "Música ativada; toque para iniciar se o navegador bloquear o áudio automático" : enabled ? "Desativar música" : "Ativar música"}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${darkHeader ? "text-white hover:bg-white/10" : "text-pink-600 hover:bg-pink-50"}`}
      >
        {enabled ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="m16 9 5 6m0-6-5 6" />
          </svg>
        )}
      </button>
    </>
  );
}
