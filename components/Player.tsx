"use client";

import { useState } from "react";
import AudioPlayer from "./AudioPlayer";

type Line = { speaker: string; text: string };

export default function Player({
  title,
  showNotes,
  audioUrl,
  lines,
}: {
  title: string;
  showNotes: string;
  audioUrl: string;
  lines: Line[];
}) {
  const [showScript, setShowScript] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {showNotes && (
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            {showNotes}
          </p>
        )}
      </div>

      <AudioPlayer src={audioUrl} />

      <div className="flex gap-2 flex-wrap">
        <a
          href={audioUrl}
          download={`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp3`}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-sm font-medium"
        >
          Download MP3
        </a>
        <button
          onClick={() => setShowScript((v) => !v)}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded text-sm"
        >
          {showScript ? "Hide" : "Show"} script
        </button>
      </div>

      {showScript && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
          {lines.map((line, i) => (
            <div key={i}>
              <div className="text-xs uppercase tracking-wider text-emerald-400 mb-0.5">
                {line.speaker}
              </div>
              <div className="text-sm text-zinc-200 leading-relaxed">
                {line.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
