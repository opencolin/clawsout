"use client";

import { useState } from "react";
import type {
  ResearchAngle,
  ResearchFinding,
} from "@/lib/research";

export type ResearchState = {
  status: "planning" | "researching" | "done" | "error";
  angles: ResearchAngle[];
  findings: ResearchFinding[];
  errors: { index: number; message: string }[];
};

export const EMPTY_RESEARCH_STATE: ResearchState = {
  status: "planning",
  angles: [],
  findings: [],
  errors: [],
};

export default function ResearchDisplay({
  state,
  compact = false,
}: {
  state: ResearchState;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);

  const totalAngles = state.angles.length;
  const foundCount = state.findings.length;
  const errorCount = state.errors.length;
  const inFlight = totalAngles - foundCount - errorCount;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2 flex items-center gap-2 text-xs hover:bg-zinc-800/50 transition-colors"
      >
        {state.status === "planning" || state.status === "researching" ? (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        ) : (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
        )}
        <span className="text-emerald-300 font-medium uppercase tracking-wider">
          {state.status === "planning" && "Planning research angles…"}
          {state.status === "researching" && "Researching…"}
          {state.status === "done" && "Research"}
          {state.status === "error" && "Research"}
        </span>
        <span className="text-zinc-500 ml-auto tabular-nums">
          {state.status === "done" || state.status === "error"
            ? `${foundCount}/${totalAngles} angles${errorCount ? ` · ${errorCount} failed` : ""}`
            : totalAngles > 0
              ? `${foundCount}/${totalAngles} · ${inFlight} in flight`
              : "…"}
        </span>
        <span className="text-zinc-500 ml-2">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
          {state.angles.length === 0 && state.status === "planning" && (
            <div className="text-xs text-zinc-500">
              Reading your source and picking three lenses worth exploring…
            </div>
          )}

          {state.angles.map((angle, i) => {
            const finding = state.findings.find(
              (f) => f.label === angle.label && f.query === angle.query,
            );
            const error = state.errors.find((e) => e.index === i);
            const searching =
              !finding && !error && state.status === "researching";

            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  {finding ? (
                    <span className="text-emerald-400 text-xs">✓</span>
                  ) : error ? (
                    <span className="text-red-400 text-xs">✕</span>
                  ) : searching ? (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ) : (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-700" />
                  )}
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
                    {angle.label}
                  </span>
                  <span className="text-xs text-zinc-500 truncate ml-2">
                    &ldquo;{angle.query}&rdquo;
                  </span>
                </div>

                {angle.rationale && !finding && !error && (
                  <div className="pl-4 text-[11px] text-zinc-500 italic">
                    {angle.rationale}
                  </div>
                )}

                {finding && (
                  <div className="pl-4 space-y-2">
                    {finding.answer && (
                      <div className="text-xs text-zinc-300 leading-relaxed">
                        {finding.answer}
                      </div>
                    )}
                    {finding.sources.length > 0 && (
                      <details className="text-[11px] text-zinc-500">
                        <summary className="cursor-pointer hover:text-zinc-300">
                          {finding.sources.length} source
                          {finding.sources.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-1 space-y-1 list-disc list-inside">
                          {finding.sources.map((s, j) => (
                            <li key={j}>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400/80 hover:text-emerald-300 underline"
                              >
                                {s.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {error && (
                  <div className="pl-4 text-[11px] text-red-400">
                    {error.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
