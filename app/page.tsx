"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ProductionMode,
  Script,
  SpeakerCast,
  Transcript,
} from "@/lib/types";
import { autoCast, DEFAULT_NARRATOR_VOICE } from "@/lib/voices";
import { GATEWAY_MODELS, DEFAULT_MODEL } from "@/lib/llm";
import Casting from "@/components/Casting";
import Player from "@/components/Player";

type Phase = "idle" | "parsing" | "scripting" | "synthesizing" | "done";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
  parsing: "Parsing transcript…",
  scripting: "Writing the script…",
  synthesizing: "Recording voices…",
  done: "Done",
};

const MODES: { id: ProductionMode; label: string; desc: string }[] = [
  {
    id: "reenactment",
    label: "Reenactment",
    desc: "AI voices perform the original participants. Best for meetings and Slack threads.",
  },
  {
    id: "documentary",
    label: "Documentary",
    desc: "Narrator drives the arc, real participants appear as clips. Best for archival or controversial content.",
  },
  {
    id: "commentary",
    label: "Commentary",
    desc: "Two AI hosts discuss the transcript. Best for explaining content to outsiders.",
  },
];

const ACCEPT_ATTR =
  ".txt,.json,.vtt,.srt,.md,.markdown,.pdf,.docx,.rtf,.html,.htm,.csv,.tsv,.mp3,.wav,.m4a,.mp4,.webm,.ogg,.flac,.mpeg,.mpga";

const AUDIO_EXT = new Set([
  "mp3",
  "wav",
  "m4a",
  "mp4",
  "webm",
  "ogg",
  "flac",
  "mpeg",
  "mpga",
]);

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function clawsLabel(level: number): string {
  if (level <= 1) return "Professional";
  if (level <= 3) return "Warm";
  if (level <= 5) return "Witty";
  if (level <= 7) return "Sharp";
  if (level <= 9) return "Claws out";
  return "Maximum claws";
}

export default function Home() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [cast, setCast] = useState<SpeakerCast>({});
  const [narrator, setNarrator] = useState(DEFAULT_NARRATOR_VOICE);
  const [mode, setMode] = useState<ProductionMode>("reenactment");
  const [guide, setGuide] = useState("");
  const [clawsOut, setClawsOut] = useState(3);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioBlobUrlRef.current) URL.revokeObjectURL(audioBlobUrlRef.current);
    };
  }, []);

  const onFile = async (f: File) => {
    setError(null);
    const ext = fileExt(f.name);
    const textExts = ["txt", "json", "vtt", "srt", "md", "markdown"];
    if (textExts.includes(ext)) {
      setText(await f.text());
      setFile(null);
    } else {
      setFile(f);
      setText("");
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await onFile(f);
  };

  const parse = async () => {
    setError(null);
    setPhase("parsing");
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        res = await fetch("/api/parse", { method: "POST", body: form });
      } else {
        res = await fetch("/api/parse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(text.trim() ? { text } : { url }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "parse failed");
      setTranscript(data.transcript);
      setCast(autoCast(data.transcript.speakers));
      setPhase("idle");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  };

  const generate = async () => {
    if (!transcript) return;
    setError(null);
    setScript(null);
    setAudioUrl(null);
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    try {
      setPhase("scripting");
      const sRes = await fetch("/api/script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript,
          mode,
          guide: guide.trim() || undefined,
          clawsOut,
          model,
        }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) throw new Error(sData.error || "script failed");
      const newScript: Script = {
        title: sData.title,
        showNotes: sData.showNotes,
        lines: sData.lines,
      };
      setScript(newScript);

      setPhase("synthesizing");
      const tRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: newScript.lines,
          cast,
          narratorVoiceId: narrator,
        }),
      });
      if (!tRes.ok) {
        const eData = await tRes.json().catch(() => ({}));
        throw new Error(eData.error || `tts failed (${tRes.status})`);
      }
      const blob = await tRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioBlobUrlRef.current = blobUrl;
      setAudioUrl(blobUrl);
      setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  };

  const reset = () => {
    setTranscript(null);
    setText("");
    setUrl("");
    setFile(null);
    setScript(null);
    setAudioUrl(null);
    setError(null);
    setPhase("idle");
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
  };

  const loadSample = async () => {
    const res = await fetch("/samples/slack-standup.json");
    setText(await res.text());
    setFile(null);
  };

  const busy =
    phase === "parsing" || phase === "scripting" || phase === "synthesizing";

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 sm:py-16 space-y-10">
      <header>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-2">
          <span className="text-emerald-400">claws</span>out
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Turn any transcript into a realistic podcast — with a comedy dial that goes claws out.
        </p>
      </header>

      {!transcript && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">1. Drop in a transcript</h2>
          <p className="text-sm text-zinc-400">
            Paste text, drop a file, or paste a URL. Supports{" "}
            <span className="text-zinc-300">
              PDF, DOCX, RTF, MD, HTML, TXT, VTT, SRT, JSON
            </span>{" "}
            (Slack/Discord), WhatsApp chat exports, and{" "}
            <span className="text-zinc-300">MP3/WAV/M4A/MP4</span> audio &amp;
            video via Whisper.
          </p>

          {file ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-xs font-mono uppercase shrink-0">
                  {fileExt(file.name) || "file"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm truncate">{file.name}</div>
                  <div className="text-xs text-zinc-500">
                    {fmtBytes(file.size)}
                    {AUDIO_EXT.has(fileExt(file.name)) &&
                      " · will transcribe via Whisper"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-zinc-400 hover:text-white text-sm"
                aria-label="remove file"
              >
                ✕
              </button>
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              placeholder={`Paste a transcript here, or drop a file.\n\nSarah: I think we should ship this Friday.\nAdam: That feels aggressive — QA still has the regression list to work through.\nSarah: We can hotfix anything critical after.`}
              className={`w-full min-h-48 bg-zinc-900 border rounded-lg p-4 text-sm font-mono focus:outline-none placeholder:text-zinc-600 transition-colors ${
                dragging
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-zinc-800 focus:border-emerald-500"
              }`}
            />
          )}

          <div className="flex flex-wrap gap-2 items-center text-sm">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) setFile(null);
              }}
              placeholder="…or paste a URL"
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
            <label className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded text-zinc-300 cursor-pointer">
              Upload file
              <input
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) =>
                  e.target.files?.[0] && onFile(e.target.files[0])
                }
                className="hidden"
              />
            </label>
            <button
              onClick={loadSample}
              className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded text-zinc-300"
            >
              Load sample
            </button>
          </div>

          <button
            disabled={!text.trim() && !url.trim() && !file}
            onClick={parse}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-medium rounded-lg py-3"
          >
            {phase === "parsing"
              ? file && AUDIO_EXT.has(fileExt(file.name))
                ? "Transcribing audio…"
                : "Parsing…"
              : "Parse transcript →"}
          </button>
        </section>
      )}

      {transcript && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              2. Cast voices
              <span className="ml-2 text-sm text-zinc-500">
                ({transcript.speakers.length} speaker
                {transcript.speakers.length === 1 ? "" : "s"} ·{" "}
                {transcript.utterances.length} utterances · source:{" "}
                {transcript.source})
              </span>
            </h2>
            <button
              onClick={reset}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              start over
            </button>
          </div>

          <Casting
            speakers={transcript.speakers}
            cast={cast}
            narratorVoiceId={narrator}
            onCastChange={setCast}
            onNarratorChange={setNarrator}
          />
        </section>
      )}

      {transcript && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">3. Pick a format</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  mode === m.id
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium text-sm mb-1">{m.label}</div>
                <div className="text-xs text-zinc-400 leading-snug">
                  {m.desc}
                </div>
              </button>
            ))}
          </div>

          <textarea
            value={guide}
            onChange={(e) => setGuide(e.target.value)}
            placeholder="Optional director's note: 'Focus on the tension around the launch date' or 'Keep it light, lots of laughter'"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
            rows={2}
          />

          <div className="space-y-2 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <label htmlFor="claws" className="text-sm font-medium text-zinc-200">
                  Claws out
                </label>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Comedy intensity — professional to roast podcast.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`text-2xl font-bold tabular-nums leading-none ${
                    clawsOut <= 3
                      ? "text-emerald-400"
                      : clawsOut <= 6
                        ? "text-amber-400"
                        : clawsOut <= 8
                          ? "text-orange-400"
                          : "text-red-500"
                  }`}
                >
                  {clawsOut}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mt-1">
                  {clawsLabel(clawsOut)}
                </div>
              </div>
            </div>
            <input
              id="claws"
              type="range"
              min={0}
              max={10}
              step={1}
              value={clawsOut}
              onChange={(e) => setClawsOut(Number(e.target.value))}
              className="claws-slider w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background:
                  "linear-gradient(to right, #10b981 0%, #84cc16 30%, #facc15 50%, #f97316 75%, #ef4444 100%)",
              }}
              aria-label="claws out comedy level"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 px-0.5 select-none">
              <span>professional</span>
              <span>witty</span>
              <span>claws out</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <label htmlFor="model" className="text-xs text-zinc-500">
              Script model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 max-w-full"
            >
              {GATEWAY_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {transcript && (
        <section className="space-y-3">
          <button
            disabled={busy}
            onClick={generate}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-medium rounded-lg py-3 text-lg"
          >
            {busy
              ? PHASE_LABEL[phase as Exclude<Phase, "idle">]
              : "Generate podcast"}
          </button>
          {busy && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 justify-center">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {phase === "scripting" &&
                  "This usually takes 15-45 seconds depending on the model."}
                {phase === "synthesizing" &&
                  `Synthesizing ${script?.lines.length ?? 0} lines via ElevenLabs — about 1-3 minutes.`}
              </span>
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {audioUrl && script && (
        <section className="space-y-4 border-t border-zinc-800 pt-8">
          <Player
            title={script.title}
            showNotes={script.showNotes}
            audioUrl={audioUrl}
            lines={script.lines}
          />
        </section>
      )}

      <footer className="pt-12 pb-4 text-xs text-zinc-600">
        Powered by Vercel AI Gateway + ElevenLabs. No accounts, no logging.
      </footer>
    </main>
  );
}
