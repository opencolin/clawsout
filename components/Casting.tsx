"use client";

import type { SpeakerCast, Voice } from "@/lib/types";
import { VOICES } from "@/lib/voices";

function VoiceSelect({
  value,
  onChange,
  filter,
}: {
  value: string;
  onChange: (id: string) => void;
  filter?: (v: Voice) => boolean;
}) {
  const voices = filter ? VOICES.filter(filter) : VOICES;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm w-full"
    >
      {voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name} — {v.gender}, {v.accent} ({v.description})
        </option>
      ))}
    </select>
  );
}

export default function Casting({
  speakers,
  cast,
  narratorVoiceId,
  onCastChange,
  onNarratorChange,
}: {
  speakers: string[];
  cast: SpeakerCast;
  narratorVoiceId: string;
  onCastChange: (cast: SpeakerCast) => void;
  onNarratorChange: (voiceId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 items-center">
        {speakers.map((speaker) => (
          <div className="contents" key={speaker}>
            <div className="text-sm text-zinc-200 font-medium truncate max-w-[160px]">
              {speaker}
            </div>
            <VoiceSelect
              value={cast[speaker] ?? VOICES[0].id}
              onChange={(id) => onCastChange({ ...cast, [speaker]: id })}
            />
          </div>
        ))}
        <div className="contents">
          <div className="text-sm text-zinc-400">Narrator</div>
          <VoiceSelect
            value={narratorVoiceId}
            onChange={onNarratorChange}
            filter={(v) => v.goodFor.includes("narrator")}
          />
        </div>
      </div>
    </div>
  );
}
