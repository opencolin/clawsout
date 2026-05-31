"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ProductionMode,
  Script,
  SpeakerCast,
  Transcript,
} from "@/lib/types";
import {
  autoCast,
  defaultVoiceFor,
  DEFAULT_NARRATOR_VOICE,
  DEFAULT_HOST_A_NAME,
  DEFAULT_HOST_B_NAME,
} from "@/lib/voices";
import type { ClonedVoice } from "@/lib/voice-cloning";
import {
  MODELS,
  DEFAULT_MODEL,
  type BYOKeys,
  type PartialScriptObject,
} from "@/lib/llm";
import type { BYOProvider } from "@/lib/errors";
import Casting from "@/components/Casting";
import Player from "@/components/Player";
import ByoKeyPrompt from "@/components/ByoKeyPrompt";
import ScriptStream from "@/components/ScriptStream";
import PostProduction from "@/components/PostProduction";
import ResearchDisplay, {
  EMPTY_RESEARCH_STATE,
  type ResearchState,
} from "@/components/ResearchDisplay";
import SavedPodcasts, {
  rememberSavedPodcast,
} from "@/components/SavedPodcasts";
import type { UserVoice } from "@/lib/elevenlabs";
import type {
  ResearchAngle,
  ResearchFinding,
} from "@/lib/research";

type Phase =
  | "idle"
  | "parsing"
  | "researching"
  | "scripting"
  | "synthesizing"
  | "done";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
  parsing: "Parsing transcript…",
  researching: "Researching the topic…",
  scripting: "Writing the script…",
  synthesizing: "Recording voices…",
  done: "Done",
};

const MODES: { id: ProductionMode; label: string; desc: string }[] = [
  {
    id: "podcast",
    label: "Podcast",
    desc: "Two AI hosts walk you through the content. The classic format — works for chats, articles, PDFs, meetings, anything.",
  },
  {
    id: "reenactment",
    label: "Reenactment",
    desc: "AI voices perform the actual people from the source. Best when the content is a conversation you want to hear.",
  },
  {
    id: "documentary",
    label: "Documentary",
    desc: "Narrator drives the arc, real participants appear as clips. Best for archival or investigative content.",
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

const BYO_LS_KEY = "clawsout.byoKeys";

type RetryAction =
  | { kind: "parse" }
  | { kind: "script-and-tts" }
  | { kind: "tts-only"; script: Script }
  | { kind: "clone-voice"; speaker: string; file: File };

type CreditPrompt = {
  provider: BYOProvider;
  reason: "insufficient_credits" | "missing_key";
  message: string;
  retry: RetryAction;
};

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

type ScriptStreamResult =
  | { kind: "done"; partial: PartialScriptObject | null }
  | { kind: "error"; data: ApiError };

type ApiError = {
  error?: string;
  code?: string;
  provider?: string;
  needsByoKey?: boolean;
};

async function streamResearch(opts: {
  transcript: Transcript;
  model: string;
  byoKeys?: BYOKeys;
  onState: (next: ResearchState) => void;
}): Promise<ResearchFinding[]> {
  const source = opts.transcript.utterances
    .map((u) => `${u.speaker}: ${u.text}`)
    .join("\n");

  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      source,
      model: opts.model,
      byoKeys: opts.byoKeys,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`research failed (${res.status}) skippable`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let state: ResearchState = { ...EMPTY_RESEARCH_STATE };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const raw of events) {
      const ev = raw.trim();
      if (!ev) continue;
      let eventName = "message";
      let dataStr = "";
      for (const line of ev.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataStr += line.slice(6);
      }
      if (!dataStr) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(dataStr);
      } catch {
        continue;
      }

      if (eventName === "planning") {
        state = { ...state, status: "planning" };
      } else if (eventName === "planned") {
        const angles = (payload as { angles?: ResearchAngle[] }).angles ?? [];
        state = { ...state, status: "researching", angles };
      } else if (eventName === "searching") {
        state = { ...state, status: "researching" };
      } else if (eventName === "found") {
        const finding = (payload as { finding?: ResearchFinding }).finding;
        if (finding) {
          state = { ...state, findings: [...state.findings, finding] };
        }
      } else if (eventName === "failed") {
        const failure = payload as {
          index?: number;
          error?: string;
        };
        if (typeof failure.index === "number") {
          state = {
            ...state,
            errors: [
              ...state.errors,
              { index: failure.index, message: failure.error ?? "failed" },
            ],
          };
        }
      } else if (eventName === "done") {
        state = { ...state, status: "done" };
      } else if (eventName === "error") {
        state = { ...state, status: "error" };
        const errMsg =
          (payload as { error?: string }).error ?? "research failed";
        opts.onState({ ...state });
        const skippable =
          (payload as { skippable?: boolean }).skippable === true;
        if (skippable) {
          return state.findings;
        }
        throw new Error(errMsg);
      }
      opts.onState({ ...state });
    }
  }

  return state.findings;
}

async function readScriptStream(
  body: ReadableStream<Uint8Array>,
  onPartial: (p: PartialScriptObject) => void,
): Promise<ScriptStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: PartialScriptObject | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const raw of events) {
      const ev = raw.trim();
      if (!ev) continue;
      let eventName = "message";
      let dataStr = "";
      for (const line of ev.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataStr += line.slice(6);
      }
      if (!dataStr) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(dataStr);
      } catch {
        continue;
      }

      if (eventName === "partial") {
        last = parsed as PartialScriptObject;
        onPartial(last);
      } else if (eventName === "error") {
        return { kind: "error", data: parsed as ApiError };
      }
    }
  }

  return { kind: "done", partial: last };
}

function loadByoKeys(): BYOKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BYO_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveByoKeys(k: BYOKeys) {
  localStorage.setItem(BYO_LS_KEY, JSON.stringify(k));
}

export default function Home() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [cast, setCast] = useState<SpeakerCast>({});
  const [narrator, setNarrator] = useState(DEFAULT_NARRATOR_VOICE);
  const [mode, setMode] = useState<ProductionMode>("podcast");
  const [hostAName, setHostAName] = useState(DEFAULT_HOST_A_NAME);
  const [hostBName, setHostBName] = useState(DEFAULT_HOST_B_NAME);
  const [useResearch, setUseResearch] = useState(true);
  const [researchState, setResearchState] =
    useState<ResearchState | null>(null);
  const [guide, setGuide] = useState("");
  const [clawsOut, setClawsOut] = useState(3);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [streamingScript, setStreamingScript] =
    useState<PartialScriptObject | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    | { phase: "idle" }
    | { phase: "saving" }
    | { phase: "saved"; slug: string; publicUrl: string }
    | { phase: "failed"; message: string }
  >({ phase: "idle" });
  const [shareCopied, setShareCopied] = useState(false);
  const [byoKeys, setByoKeys] = useState<BYOKeys>({});
  const [creditPrompt, setCreditPrompt] = useState<CreditPrompt | null>(null);
  const [customVoices, setCustomVoices] = useState<Record<string, ClonedVoice>>(
    {},
  );
  const [cloningSpeaker, setCloningSpeaker] = useState<string | null>(null);
  const [userVoices, setUserVoices] = useState<UserVoice[]>([]);
  const audioBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setByoKeys(loadByoKeys());
  }, []);

  useEffect(() => {
    if (!transcript) return;
    const headers: Record<string, string> = {};
    if (byoKeys.elevenlabs) headers["x-byo-key"] = byoKeys.elevenlabs;
    let cancelled = false;
    fetch("/api/voices", { headers })
      .then((r) => r.json())
      .then((data: { voices?: UserVoice[] }) => {
        if (cancelled) return;
        setUserVoices(data.voices ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [transcript, byoKeys.elevenlabs, customVoices]);

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

  const handleCreditError = (
    data: ApiError,
    retry: RetryAction,
  ): boolean => {
    if (!data.needsByoKey) return false;
    const knownProviders: BYOProvider[] = [
      "anthropic",
      "openai",
      "google",
      "nebius",
      "elevenlabs",
    ];
    if (!knownProviders.includes(data.provider as BYOProvider)) return false;
    setCreditPrompt({
      provider: data.provider as BYOProvider,
      reason:
        data.code === "missing_key" ? "missing_key" : "insufficient_credits",
      message: data.error ?? "Out of credits or no key configured.",
      retry,
    });
    setPhase("idle");
    return true;
  };

  const parse = async (overrideKeys?: BYOKeys) => {
    const keys = overrideKeys ?? byoKeys;
    setError(null);
    setPhase("parsing");
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        if (AUDIO_EXT.has(fileExt(file.name)) && keys.openai) {
          form.append("byoKey", keys.openai);
        }
        res = await fetch("/api/parse", { method: "POST", body: form });
      } else {
        res = await fetch("/api/parse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(text.trim() ? { text } : { url }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        if (handleCreditError(data, { kind: "parse" })) return;
        throw new Error(data.error || "parse failed");
      }
      setTranscript(data.transcript);
      setCast(autoCast(data.transcript.speakers));
      setPhase("idle");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  };

  const generate = async (overrideKeys?: BYOKeys, fromScript?: Script) => {
    if (!transcript) return;
    const keys = overrideKeys ?? byoKeys;
    setError(null);
    if (!fromScript) {
      setScript(null);
      setStreamingScript(null);
      setAudioUrl(null);
      setResearchState(null);
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    }

    try {
      let workingScript: Script;
      let researchFindings: ResearchFinding[] = [];

      if (!fromScript && useResearch) {
        setPhase("researching");
        const initial: ResearchState = { ...EMPTY_RESEARCH_STATE };
        setResearchState(initial);
        try {
          researchFindings = await streamResearch({
            transcript,
            model,
            byoKeys: keys,
            onState: setResearchState,
          });
        } catch (e: unknown) {
          setResearchState((prev) => ({
            ...(prev ?? EMPTY_RESEARCH_STATE),
            status: "error",
          }));
          const msg = e instanceof Error ? e.message : String(e);
          if (!/skippable/i.test(msg)) {
            console.warn("research failed but continuing:", msg);
          }
        }
      }

      if (fromScript) {
        workingScript = fromScript;
        setScript(fromScript);
        setStreamingScript(fromScript);
      } else {
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
            byoKeys: keys,
            hostNames: { a: hostAName.trim() || DEFAULT_HOST_A_NAME, b: hostBName.trim() || DEFAULT_HOST_B_NAME },
            research: researchFindings,
          }),
        });

        if (!sRes.ok || !sRes.body) {
          const data = (await sRes.json().catch(() => ({}))) as ApiError;
          if (handleCreditError(data, { kind: "script-and-tts" })) return;
          throw new Error(data.error || `script failed (${sRes.status})`);
        }

        const result = await readScriptStream(sRes.body, setStreamingScript);
        if (result.kind === "error") {
          if (handleCreditError(result.data, { kind: "script-and-tts" })) return;
          throw new Error(result.data.error || "script failed");
        }
        const partial = result.partial;
        if (!partial?.lines || partial.lines.length === 0) {
          throw new Error("Script generation produced no lines");
        }
        workingScript = {
          title: partial.title ?? "Untitled episode",
          showNotes: partial.showNotes ?? "",
          lines: partial.lines.filter(
            (l): l is { speaker: string; text: string } =>
              Boolean(l.speaker && l.text),
          ),
        };
        setScript(workingScript);
        setStreamingScript({
          title: workingScript.title,
          showNotes: workingScript.showNotes,
          lines: workingScript.lines,
        });
      }

      setPhase("synthesizing");
      const tRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: workingScript.lines,
          cast,
          narratorVoiceId: narrator,
          byoKey: keys.elevenlabs,
          hostNames: { a: hostAName.trim() || DEFAULT_HOST_A_NAME, b: hostBName.trim() || DEFAULT_HOST_B_NAME },
          clawsOut,
        }),
      });
      if (!tRes.ok) {
        const eData = (await tRes.json().catch(() => ({}))) as ApiError;
        if (
          handleCreditError(eData, {
            kind: "tts-only",
            script: workingScript,
          })
        )
          return;
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

  const cloneVoice = async (
    speaker: string,
    file: File,
    overrideKeys?: BYOKeys,
  ) => {
    const keys = overrideKeys ?? byoKeys;
    setError(null);
    setCloningSpeaker(speaker);
    try {
      const form = new FormData();
      form.append("name", speaker);
      form.append("file", file);
      if (keys.elevenlabs) form.append("byoKey", keys.elevenlabs);

      const res = await fetch("/api/clone-voice", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as ApiError & {
        voiceId?: string;
        name?: string;
      };
      if (!res.ok) {
        if (handleCreditError(data, { kind: "clone-voice", speaker, file })) {
          setCloningSpeaker(null);
          return;
        }
        throw new Error(data.error || `voice clone failed (${res.status})`);
      }

      const cloned: ClonedVoice = {
        voiceId: data.voiceId ?? "",
        name: data.name ?? speaker,
      };
      setCustomVoices((prev) => ({ ...prev, [speaker]: cloned }));
      setCast((prev) => ({ ...prev, [speaker]: cloned.voiceId }));
      setCloningSpeaker(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setCloningSpeaker(null);
    }
  };

  const clearClone = (speaker: string) => {
    setCustomVoices((prev) => {
      const next = { ...prev };
      delete next[speaker];
      return next;
    });
    if (transcript) {
      setCast((prev) => ({
        ...prev,
        [speaker]: defaultVoiceFor(speaker, transcript.speakers),
      }));
    }
  };

  const renameSpeaker = (oldName: string, newName: string) => {
    if (!transcript) return;
    if (oldName === newName) return;
    setTranscript((prev) =>
      prev
        ? {
            ...prev,
            speakers: prev.speakers.map((s) => (s === oldName ? newName : s)),
            utterances: prev.utterances.map((u) =>
              u.speaker === oldName ? { ...u, speaker: newName } : u,
            ),
          }
        : prev,
    );
    setCast((prev) => {
      if (!(oldName in prev)) return prev;
      const next = { ...prev };
      next[newName] = next[oldName];
      delete next[oldName];
      return next;
    });
    setCustomVoices((prev) => {
      if (!(oldName in prev)) return prev;
      const next = { ...prev };
      next[newName] = next[oldName];
      delete next[oldName];
      return next;
    });
  };

  const editTitle = (title: string) => {
    setStreamingScript((prev) =>
      prev ? { ...prev, title } : { title, lines: [] },
    );
    setScript((prev) => (prev ? { ...prev, title } : prev));
  };

  const editNotes = (showNotes: string) => {
    setStreamingScript((prev) =>
      prev ? { ...prev, showNotes } : { showNotes, lines: [] },
    );
    setScript((prev) => (prev ? { ...prev, showNotes } : prev));
  };

  const editLine = (index: number, text: string) => {
    setStreamingScript((prev) => {
      if (!prev?.lines) return prev;
      const lines = [...prev.lines];
      const existing = lines[index] ?? { speaker: "", text: "" };
      lines[index] = { ...existing, text };
      return { ...prev, lines };
    });
    setScript((prev) => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      if (lines[index]) {
        lines[index] = { ...lines[index], text };
      }
      return { ...prev, lines };
    });
  };

  const savePodcast = async () => {
    if (!audioUrl || !script || !transcript) return;
    setSaveState({ phase: "saving" });
    try {
      const audioRes = await fetch(audioUrl);
      const audioBlob = await audioRes.blob();
      const audioFile = new File([audioBlob], `${script.title}.mp3`, {
        type: "audio/mpeg",
      });

      const sourceExcerpt = transcript.utterances
        .slice(0, 10)
        .map((u) => `${u.speaker}: ${u.text}`)
        .join("\n")
        .slice(0, 2000);

      const metadata = {
        title: script.title,
        showNotes: script.showNotes,
        lines: script.lines,
        mode,
        clawsOut,
        model,
        hostNames: {
          a: hostAName.trim() || DEFAULT_HOST_A_NAME,
          b: hostBName.trim() || DEFAULT_HOST_B_NAME,
        },
        cast,
        narratorVoiceId: narrator,
        research:
          researchState?.findings && researchState.findings.length > 0
            ? researchState.findings
            : undefined,
        sourceExcerpt,
        sourceFormat: transcript.source,
        speakerCount: transcript.speakers.length,
        utteranceCount: transcript.utterances.length,
      };

      const form = new FormData();
      form.append("audio", audioFile);
      form.append("metadata", JSON.stringify(metadata));

      const res = await fetch("/api/podcasts", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        slug?: string;
        publicUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.slug || !data.publicUrl) {
        setSaveState({
          phase: "failed",
          message: data.error || `save failed (${res.status})`,
        });
        return;
      }

      rememberSavedPodcast({
        slug: data.slug,
        title: script.title,
        savedAt: new Date().toISOString(),
      });
      setSaveState({
        phase: "saved",
        slug: data.slug,
        publicUrl: data.publicUrl,
      });
    } catch (e: unknown) {
      setSaveState({
        phase: "failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const copyShareLink = async () => {
    if (saveState.phase !== "saved") return;
    const url = `${window.location.origin}${saveState.publicUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const regenerateAudio = () => {
    if (!script) return;
    void generate(undefined, script);
  };

  const onSaveBYOKey = (key: string) => {
    if (!creditPrompt) return;
    const newKeys = { ...byoKeys, [creditPrompt.provider]: key };
    setByoKeys(newKeys);
    saveByoKeys(newKeys);
    const retry = creditPrompt.retry;
    setCreditPrompt(null);
    if (retry.kind === "parse") {
      void parse(newKeys);
    } else if (retry.kind === "script-and-tts") {
      void generate(newKeys);
    } else if (retry.kind === "clone-voice") {
      void cloneVoice(retry.speaker, retry.file, newKeys);
    } else {
      void generate(newKeys, retry.script);
    }
  };

  const reset = () => {
    setTranscript(null);
    setText("");
    setUrl("");
    setFile(null);
    setScript(null);
    setStreamingScript(null);
    setAudioUrl(null);
    setError(null);
    setCreditPrompt(null);
    setCustomVoices({});
    setCloningSpeaker(null);
    setResearchState(null);
    setSaveState({ phase: "idle" });
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
    phase === "parsing" ||
    phase === "researching" ||
    phase === "scripting" ||
    phase === "synthesizing";

  const anyByoKeySet = Object.values(byoKeys).some(Boolean);

  const clearByoKeys = () => {
    setByoKeys({});
    saveByoKeys({});
  };

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 sm:py-16 space-y-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-emerald-400">claws</span>out
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Turn any content — chats, docs, articles, audio — into a realistic podcast. With a comedy dial that goes claws out.
          </p>
        </div>
        <SavedPodcasts />
      </header>

      {!transcript && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">1. Drop in your content</h2>
          <p className="text-sm text-zinc-400">
            Paste text, drop a file, or paste a URL — chat transcripts,
            articles, meeting notes, anything. Supports{" "}
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
              placeholder={`Paste anything here — a chat, a doc, an article, meeting notes.\n\nSarah: I think we should ship this Friday.\nAdam: That feels aggressive — QA still has the regression list to work through.\nSarah: We can hotfix anything critical after.`}
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
            onClick={() => parse()}
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
            customVoices={customVoices}
            cloningSpeaker={cloningSpeaker}
            userVoices={userVoices}
            onCastChange={setCast}
            onNarratorChange={setNarrator}
            onCloneRequest={cloneVoice}
            onClearClone={clearClone}
            onRenameSpeaker={renameSpeaker}
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

          {mode === "podcast" && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-xs text-zinc-400">Host names</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-emerald-400">
                    Lead (teacher)
                  </label>
                  <input
                    type="text"
                    value={hostAName}
                    onChange={(e) => setHostAName(e.target.value)}
                    placeholder={DEFAULT_HOST_A_NAME}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-emerald-400">
                    Co-host (curious)
                  </label>
                  <input
                    type="text"
                    value={hostBName}
                    onChange={(e) => setHostBName(e.target.value)}
                    placeholder={DEFAULT_HOST_B_NAME}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                These names go straight into the script. Default matches the
                two voices: <span className="text-zinc-300">{DEFAULT_HOST_A_NAME}</span> and{" "}
                <span className="text-zinc-300">{DEFAULT_HOST_B_NAME}</span>.
              </p>
            </div>
          )}

          <label className="flex items-start gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-700">
            <input
              type="checkbox"
              checked={useResearch}
              onChange={(e) => setUseResearch(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-200">
                Deep research (3 angles)
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                Spawns three parallel agents that search the web for context,
                background, and counterpoints to enrich the podcast. Adds 10–20s.
                Powered by Tavily.
              </p>
            </div>
          </label>

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
              <optgroup label="Vercel AI Gateway">
                {MODELS.filter((m) => m.provider === "gateway").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Nebius Token Factory">
                {MODELS.filter((m) => m.provider === "nebius").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </section>
      )}

      {transcript && (
        <section className="space-y-3">
          <button
            disabled={busy}
            onClick={() => generate()}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-medium rounded-lg py-3 text-lg"
          >
            {busy
              ? PHASE_LABEL[phase as Exclude<Phase, "idle">]
              : "Generate podcast"}
          </button>
          {phase === "synthesizing" && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 justify-center">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Synthesizing {script?.lines.length ?? 0} lines via ElevenLabs — about 1-3 minutes.
              </span>
            </div>
          )}
          {anyByoKeySet && (
            <div className="text-xs text-zinc-500 flex items-center justify-between">
              <span>
                Using your keys for:{" "}
                {Object.entries(byoKeys)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ")}
              </span>
              <button
                onClick={clearByoKeys}
                className="text-zinc-400 hover:text-white underline"
              >
                clear stored keys
              </button>
            </div>
          )}
        </section>
      )}

      {creditPrompt && (
        <ByoKeyPrompt
          provider={creditPrompt.provider}
          reason={creditPrompt.reason}
          message={creditPrompt.message}
          onSave={onSaveBYOKey}
          onCancel={() => setCreditPrompt(null)}
        />
      )}

      {error && !creditPrompt && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {researchState && (
        <section className="space-y-4 border-t border-zinc-800 pt-8">
          <ResearchDisplay
            state={researchState}
            compact={phase !== "researching"}
          />
        </section>
      )}

      {streamingScript && (
        <section className="space-y-4 border-t border-zinc-800 pt-8">
          <ScriptStream
            title={streamingScript.title}
            showNotes={streamingScript.showNotes}
            lines={streamingScript.lines}
            streaming={phase === "scripting"}
            editable={
              script
                ? {
                    onTitleChange: editTitle,
                    onNotesChange: editNotes,
                    onLineChange: editLine,
                  }
                : undefined
            }
          />
          {audioUrl && script && transcript && (
            <>
              <Player src={audioUrl} filename={script.title} />
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  onClick={regenerateAudio}
                  disabled={busy}
                  className="px-3 py-1.5 border border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-300 rounded text-zinc-300 disabled:opacity-50"
                >
                  {phase === "synthesizing"
                    ? "Re-synthesizing…"
                    : "↻ Regenerate audio with edits"}
                </button>
                {saveState.phase === "idle" || saveState.phase === "failed" ? (
                  <button
                    onClick={savePodcast}
                    disabled={busy}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-medium rounded"
                  >
                    Save &amp; share
                  </button>
                ) : null}
                {saveState.phase === "saving" && (
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Saving…
                  </span>
                )}
                <span className="text-zinc-500">
                  Edits to the script above don&apos;t affect the player until you regenerate.
                </span>
              </div>

              {saveState.phase === "saved" && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wider text-emerald-300 font-medium">
                    Saved
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.origin}${saveState.publicUrl}`
                          : saveState.publicUrl
                      }
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-200"
                    />
                    <button
                      onClick={copyShareLink}
                      className={`px-3 py-1.5 rounded text-xs font-medium border ${
                        shareCopied
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-800 hover:border-emerald-500/50 text-zinc-300"
                      }`}
                    >
                      {shareCopied ? "✓ Copied" : "Copy"}
                    </button>
                    <a
                      href={saveState.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded text-xs text-zinc-300"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>
              )}

              {saveState.phase === "failed" && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-xs text-red-200">
                  Save failed: {saveState.message}
                </div>
              )}
              <PostProduction
                audioUrl={audioUrl}
                title={script.title}
                scriptText={script.lines
                  .map((l) => `${l.speaker}: ${l.text}`)
                  .join("\n\n")}
                defaultVoiceId={cast[transcript.speakers[0]] ?? narrator}
                narratorVoiceId={narrator}
                byoKey={byoKeys.elevenlabs}
                onCreditError={(data) => {
                  if (!data.needsByoKey) return false;
                  setCreditPrompt({
                    provider: "elevenlabs",
                    reason:
                      data.code === "missing_key"
                        ? "missing_key"
                        : "insufficient_credits",
                    message:
                      data.error ?? "Out of credits or no key configured.",
                    retry: { kind: "tts-only", script },
                  });
                  return true;
                }}
              />
            </>
          )}
        </section>
      )}

      <footer className="pt-12 pb-4 text-xs text-zinc-600">
        Powered by Vercel AI Gateway, Nebius Token Factory, and ElevenLabs. No accounts, no logging.
      </footer>
    </main>
  );
}
