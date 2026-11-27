"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFERENCE_KEY = "ka-seasonal-music-enabled-v1";
const DEFAULT_TRACK = "/audio/jingle-bells-music-box-wavemaster-175881.mp3";

type AmbientMusic = {
  enabled: boolean;
  url: string | null;
  volume: number;
};

function normalizedVolume(value: number) {
  return Math.min(0.08, Math.max(0, Number.isFinite(value) ? value : 0.08));
}

export default function SeasonalAudioControlWeb() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [music, setMusic] = useState<AmbientMusic | null>(null);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/storefront/presentation", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o tema da loja.");
        return response.json() as Promise<{ ambientMusic?: AmbientMusic }>;
      })
      .then((payload) => {
        if (!active || !payload.ambientMusic) return;
        setMusic(payload.ambientMusic);
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

    return () => { active = false; };
  }, []);

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

    if (!audio.paused) {
      audio.pause();
      setEnabled(false);
      try { window.localStorage.setItem(PREFERENCE_KEY, "off"); } catch { /* optional preference */ }
      return;
    }

    setEnabled(true);
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
        aria-label={playing ? "Desativar música natalina" : "Ativar música natalina"}
        aria-pressed={playing}
        title={playing ? "Desativar música" : "Ativar música"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-pink-600 transition-colors hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      >
        {playing ? (
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
