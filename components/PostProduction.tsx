"use client";

import { useEffect, useRef, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import { DUB_LANGUAGES, languageName } from "@/lib/languages";

type ApiError = {
  error?: string;
  code?: string;
  provider?: string;
  needsByoKey?: boolean;
};

type DubState =
  | { phase: "idle" }
  | { phase: "starting"; lang: string }
  | { phase: "polling"; lang: string; dubbingId: string }
  | { phase: "ready"; lang: string; dubbingId: string; audioUrl: string }
  | { phase: "failed"; lang: string; message: string };

export default function PostProduction({
  audioUrl,
  title,
  scriptText,
  defaultVoiceId,
  narratorVoiceId,
  byoKey,
  onCreditError,
}: {
  audioUrl: string;
  title: string;
  scriptText: string;
  defaultVoiceId: string;
  narratorVoiceId: string;
  byoKey?: string;
  onCreditError: (data: ApiError) => boolean;
}) {
  const [dub, setDub] = useState<DubState>({ phase: "idle" });
  const [lang, setLang] = useState("es");
  const [studio, setStudio] = useState<
    | { phase: "idle" }
    | { phase: "creating" }
    | { phase: "ready"; url: string }
    | { phase: "failed"; message: string }
  >({ phase: "idle" });
  const dubAudioRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (dubAudioRef.current) URL.revokeObjectURL(dubAudioRef.current);
    };
  }, []);

  const startDub = async () => {
    setDub({ phase: "starting", lang });
    try {
      const audioRes = await fetch(audioUrl);
      const blob = await audioRes.blob();
      const form = new FormData();
      form.append("file", blob, `${title}.mp3`);
      form.append("target_lang", lang);
      if (byoKey) form.append("byoKey", byoKey);

      const res = await fetch("/api/dub", { method: "POST", body: form });
      const data = (await res.json()) as ApiError & { dubbingId?: string };
      if (!res.ok) {
        if (onCreditError(data)) {
          setDub({ phase: "idle" });
          return;
        }
        setDub({
          phase: "failed",
          lang,
          message: data.error || `dub failed (${res.status})`,
        });
        return;
      }
      if (!data.dubbingId) {
        setDub({ phase: "failed", lang, message: "no dubbing id returned" });
        return;
      }
      setDub({ phase: "polling", lang, dubbingId: data.dubbingId });
      void pollDub(data.dubbingId, lang);
    } catch (e: unknown) {
      setDub({
        phase: "failed",
        lang,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const pollDub = async (dubbingId: string, langCode: string) => {
    const start = Date.now();
    const TIMEOUT_MS = 10 * 60 * 1000;
    while (Date.now() - start < TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const headers: Record<string, string> = {};
        if (byoKey) headers["x-byo-key"] = byoKey;
        const res = await fetch(`/api/dub/${dubbingId}`, { headers });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as ApiError;
          if (onCreditError(data)) {
            setDub({ phase: "idle" });
            return;
          }
          setDub({
            phase: "failed",
            lang: langCode,
            message: data.error || `poll failed (${res.status})`,
          });
          return;
        }
        const data = (await res.json()) as {
          status: string;
          errorMessage?: string;
        };
        if (data.status === "dubbed") {
          const audioRes = await fetch(
            `/api/dub/${dubbingId}?audio=1&lang=${langCode}`,
            { headers },
          );
          if (!audioRes.ok) {
            setDub({
              phase: "failed",
              lang: langCode,
              message: "fetched dub but audio download failed",
            });
            return;
          }
          const audioBlob = await audioRes.blob();
          const url = URL.createObjectURL(audioBlob);
          if (dubAudioRef.current) URL.revokeObjectURL(dubAudioRef.current);
          dubAudioRef.current = url;
          setDub({
            phase: "ready",
            lang: langCode,
            dubbingId,
            audioUrl: url,
          });
          return;
        }
        if (data.status === "failed") {
          setDub({
            phase: "failed",
            lang: langCode,
            message: data.errorMessage || "dubbing failed",
          });
          return;
        }
      } catch (e: unknown) {
        setDub({
          phase: "failed",
          lang: langCode,
          message: e instanceof Error ? e.message : String(e),
        });
        return;
      }
    }
    setDub({
      phase: "failed",
      lang: langCode,
      message: "dub timed out after 10 minutes",
    });
  };

  const saveToStudio = async () => {
    setStudio({ phase: "creating" });
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: title,
          scriptText,
          defaultVoiceId,
          narratorVoiceId,
          byoKey,
        }),
      });
      const data = (await res.json()) as ApiError & {
        projectId?: string;
        studioUrl?: string;
      };
      if (!res.ok) {
        if (onCreditError(data)) {
          setStudio({ phase: "idle" });
          return;
        }
        setStudio({
          phase: "failed",
          message: data.error || `studio failed (${res.status})`,
        });
        return;
      }
      if (!data.studioUrl) {
        setStudio({ phase: "failed", message: "no studio url returned" });
        return;
      }
      setStudio({ phase: "ready", url: data.studioUrl });
      window.open(data.studioUrl, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      setStudio({
        phase: "failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const dubbing =
    dub.phase === "starting" || dub.phase === "polling";

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-800">
      <h3 className="text-sm font-medium text-zinc-200">Post-production</h3>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          disabled={dubbing}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm disabled:opacity-50"
          aria-label="target language"
        >
          {DUB_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          onClick={startDub}
          disabled={dubbing}
          className="px-3 py-1.5 border border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-300 rounded text-sm text-zinc-300 disabled:opacity-50"
        >
          {dubbing ? `Translating to ${languageName(dub.lang)}…` : "Translate"}
        </button>
        <button
          onClick={saveToStudio}
          disabled={studio.phase === "creating"}
          className="px-3 py-1.5 border border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-300 rounded text-sm text-zinc-300 disabled:opacity-50"
        >
          {studio.phase === "creating"
            ? "Saving to Studio…"
            : studio.phase === "ready"
              ? "Saved · open Studio"
              : "Save to ElevenLabs Studio"}
        </button>
        {studio.phase === "ready" && (
          <a
            href={studio.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-400 underline"
          >
            open project →
          </a>
        )}
      </div>

      {dubbing && (
        <p className="text-xs text-zinc-500">
          Dubbing takes 1–5 minutes depending on length. We&apos;ll poll until it&apos;s ready.
        </p>
      )}

      {dub.phase === "failed" && (
        <p className="text-xs text-red-400">Dubbing failed: {dub.message}</p>
      )}
      {studio.phase === "failed" && (
        <p className="text-xs text-red-400">Studio failed: {studio.message}</p>
      )}

      {dub.phase === "ready" && (
        <div className="space-y-2 bg-zinc-900/50 border border-emerald-500/30 rounded-lg p-3">
          <div className="text-xs text-emerald-300 font-medium uppercase tracking-wider">
            {languageName(dub.lang)} dub
          </div>
          <AudioPlayer src={dub.audioUrl} />
          <a
            href={dub.audioUrl}
            download={`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${dub.lang}.mp3`}
            className="inline-block px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-xs font-medium"
          >
            Download {languageName(dub.lang)} MP3
          </a>
        </div>
      )}
    </div>
  );
}
