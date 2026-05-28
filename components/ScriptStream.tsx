"use client";

import { useEffect, useRef } from "react";

type Line = { speaker?: string; text?: string };

export default function ScriptStream({
  title,
  showNotes,
  lines,
  streaming,
}: {
  title?: string;
  showNotes?: string;
  lines?: Line[];
  streaming: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streaming || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [lines, streaming]);

  const safeLines = lines ?? [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {streaming && (
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-zinc-800 flex items-center gap-2 text-xs">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 font-medium uppercase tracking-wider">
            Writing
          </span>
          <span className="text-zinc-500 ml-auto tabular-nums">
            {safeLines.length} line{safeLines.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      <div ref={containerRef} className="max-h-96 overflow-y-auto p-5 space-y-4">
        {title ? (
          <h3 className="text-xl font-semibold tracking-tight">
            {title}
            {streaming && !showNotes && <BlinkingCursor />}
          </h3>
        ) : streaming ? (
          <h3 className="text-xl font-semibold text-zinc-700">
            <BlinkingCursor />
          </h3>
        ) : null}

        {showNotes && (
          <p className="text-sm text-zinc-400 leading-relaxed">
            {showNotes}
            {streaming && safeLines.length === 0 && <BlinkingCursor />}
          </p>
        )}

        {safeLines.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            {safeLines.map((line, i) => {
              const isLast = i === safeLines.length - 1;
              return (
                <div key={i}>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 font-medium">
                    {line.speaker || "…"}
                  </div>
                  <div className="text-sm text-zinc-200 leading-relaxed">
                    {line.text || ""}
                    {streaming && isLast && <BlinkingCursor />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BlinkingCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-emerald-400 ml-0.5 align-text-bottom animate-pulse"
      aria-hidden
    />
  );
}
