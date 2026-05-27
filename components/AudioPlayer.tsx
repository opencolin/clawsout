"use client";

import { useEffect, useRef, useState } from "react";

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      if (!scrubbing) setCurrent(a.currentTime);
    };
    const onMeta = () => {
      const d = a.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [scrubbing]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const seek = (pct: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(duration) || duration === 0) return;
    const t = Math.max(0, Math.min(duration, pct * duration));
    a.currentTime = t;
    setCurrent(t);
  };

  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(duration, a.currentTime + delta));
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={() => skip(-15)}
          className="text-zinc-400 hover:text-white px-2 py-1 text-sm tabular-nums"
          aria-label="back 15 seconds"
          title="back 15s"
        >
          -15
        </button>

        <button
          onClick={toggle}
          aria-label={playing ? "pause" : "play"}
          className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shrink-0"
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => skip(15)}
          className="text-zinc-400 hover:text-white px-2 py-1 text-sm tabular-nums"
          aria-label="forward 15 seconds"
          title="forward 15s"
        >
          +15
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs tabular-nums text-zinc-400 w-10 text-right">
            {fmt(current)}
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(pct * 10)}
            onChange={(e) => {
              setScrubbing(true);
              const v = Number(e.target.value) / 1000;
              setCurrent(v * duration);
            }}
            onMouseUp={(e) => {
              const v = Number((e.target as HTMLInputElement).value) / 1000;
              seek(v);
              setScrubbing(false);
            }}
            onTouchEnd={(e) => {
              const v = Number((e.target as HTMLInputElement).value) / 1000;
              seek(v);
              setScrubbing(false);
            }}
            className="flex-1 h-2 accent-emerald-500"
            style={{
              background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${pct}%, rgb(63 63 70) ${pct}%, rgb(63 63 70) 100%)`,
              WebkitAppearance: "none",
              appearance: "none",
              borderRadius: "999px",
              outline: "none",
              cursor: "pointer",
            }}
            aria-label="seek"
          />
          <span className="text-xs tabular-nums text-zinc-400 w-10">
            {fmt(duration)}
          </span>
        </div>
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 0;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 0;
        }
      `}</style>
    </div>
  );
}
