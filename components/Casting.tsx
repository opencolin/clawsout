"use client";

import { useState } from "react";
import type { SpeakerCast, Voice } from "@/lib/types";
import type { ClonedVoice } from "@/lib/voice-cloning";
import type { UserVoice } from "@/lib/elevenlabs";
import { VOICES } from "@/lib/voices";

const CLONE_ACCEPT = ".mp3,.wav,.m4a,.flac,.ogg,audio/*";
const MAX_SAMPLE_MB = 4;

function VoiceSelect({
  value,
  onChange,
  filter,
  disabled,
  userVoices,
}: {
  value: string;
  onChange: (id: string) => void;
  filter?: (v: Voice) => boolean;
  disabled?: boolean;
  userVoices?: UserVoice[];
}) {
  const voices = filter ? VOICES.filter(filter) : VOICES;
  const lib = (userVoices ?? []).filter((v) => v.voiceId && v.name);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm w-full disabled:opacity-50"
    >
      {lib.length > 0 && (
        <optgroup label="Your ElevenLabs library">
          {lib.map((v) => (
            <option key={v.voiceId} value={v.voiceId}>
              {v.name} — {v.category}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Curated presets">
        {voices.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} — {v.gender}, {v.accent} ({v.description})
          </option>
        ))}
      </optgroup>
    </select>
  );
}

export default function Casting({
  speakers,
  cast,
  narratorVoiceId,
  customVoices,
  cloningSpeaker,
  userVoices,
  onCastChange,
  onNarratorChange,
  onCloneRequest,
  onClearClone,
  onRenameSpeaker,
}: {
  speakers: string[];
  cast: SpeakerCast;
  narratorVoiceId: string;
  customVoices: Record<string, ClonedVoice>;
  cloningSpeaker: string | null;
  userVoices: UserVoice[];
  onCastChange: (cast: SpeakerCast) => void;
  onNarratorChange: (voiceId: string) => void;
  onCloneRequest: (speaker: string, file: File) => void;
  onClearClone: (speaker: string) => void;
  onRenameSpeaker: (oldName: string, newName: string) => void;
}) {
  const handlePick = (speaker: string, file: File | null) => {
    if (!file) return;
    if (file.size > MAX_SAMPLE_MB * 1024 * 1024) {
      alert(
        `Audio sample is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under ${MAX_SAMPLE_MB} MB. A clean ~30-60 second clip works best.`,
      );
      return;
    }
    onCloneRequest(speaker, file);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {speakers.map((speaker) => {
          const cloned = customVoices[speaker];
          const isCloning = cloningSpeaker === speaker;
          return (
            <div
              key={speaker}
              className="flex items-center gap-3"
            >
              <SpeakerNameInput
                value={speaker}
                onCommit={(newName) => onRenameSpeaker(speaker, newName)}
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {cloned ? (
                  <div className="flex-1 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/40 rounded px-3 py-1.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold shrink-0">
                        Cloned
                      </span>
                      <span className="text-zinc-200 truncate">
                        {cloned.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onClearClone(speaker)}
                      className="text-zinc-400 hover:text-white text-xs shrink-0 ml-2"
                      aria-label={`remove cloned voice for ${speaker}`}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <VoiceSelect
                        value={cast[speaker] ?? VOICES[0].id}
                        onChange={(id) =>
                          onCastChange({ ...cast, [speaker]: id })
                        }
                        disabled={isCloning}
                        userVoices={userVoices}
                      />
                    </div>
                    <label
                      className={`px-2 py-1.5 border border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-300 rounded text-xs text-zinc-400 cursor-pointer shrink-0 ${
                        isCloning ? "opacity-50 cursor-wait" : ""
                      }`}
                      title="Upload a 30-60s audio sample to clone this person's voice"
                    >
                      {isCloning ? "Cloning…" : "Clone voice"}
                      <input
                        type="file"
                        accept={CLONE_ACCEPT}
                        disabled={isCloning}
                        onChange={(e) => {
                          handlePick(speaker, e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-3 pt-1">
          <div className="text-sm text-zinc-400 w-32 shrink-0">Narrator</div>
          <div className="flex-1 min-w-0">
            <VoiceSelect
              value={narratorVoiceId}
              onChange={onNarratorChange}
              filter={(v) => v.goodFor.includes("narrator")}
              userVoices={userVoices}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Voice cloning:</strong> upload a clean
        30–60 second audio sample for any speaker and ElevenLabs will create an
        instant voice clone for them. Best with mono speech, no music or
        background noise.{" "}
        <strong className="text-zinc-400">Rename a speaker</strong> by clicking
        their name — useful for anonymized labels like &ldquo;Speaker
        Zero&rdquo;.
      </p>
    </div>
  );
}

function SpeakerNameInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (newName: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="text-sm text-zinc-200 font-medium truncate w-32 shrink-0 bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none hover:border-zinc-700 transition-colors px-1 -ml-1"
      aria-label="speaker name"
      title="Click to rename"
    />
  );
}
