"use client";

import { useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import type { PodcastRecord } from "@/lib/storage";

export default function PodcastViewerClient({
  record,
}: {
  record: PodcastRecord;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const savedDate = new Date(record.savedAt);
  const dateLabel = isNaN(savedDate.getTime())
    ? ""
    : savedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 sm:py-16 space-y-8">
      <header className="flex items-center justify-between">
        <a
          href="/"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← <span className="text-emerald-400">claws</span>out
        </a>
        <button
          onClick={copyLink}
          className={`text-xs px-2 py-1 rounded border ${
            copied
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-800 hover:border-zinc-600 text-zinc-300"
          }`}
        >
          {copied ? "✓ Copied" : "Copy share link"}
        </button>
      </header>

      <section>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {record.title}
        </h1>
        {record.showNotes && (
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            {record.showNotes}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-zinc-600 mt-3">
          {dateLabel && <span>{dateLabel}</span>}
          {dateLabel && <span>·</span>}
          <span>{record.lines.length} lines</span>
          {record.mode && (
            <>
              <span>·</span>
              <span>{record.mode}</span>
            </>
          )}
        </div>
      </section>

      {record.audioUrl && (
        <section className="space-y-3">
          <AudioPlayer src={record.audioUrl} />
          <a
            href={record.audioUrl}
            download={`${record.slug}.mp3`}
            className="inline-block px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-sm font-medium"
          >
            Download MP3
          </a>
        </section>
      )}

      <section className="space-y-4 border-t border-zinc-800 pt-8">
        <h2 className="text-lg font-medium">Transcript</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 max-h-[36rem] overflow-y-auto">
          {record.lines.map((line, i) => (
            <div key={i}>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 font-medium">
                {line.speaker}
              </div>
              <div className="text-sm text-zinc-200 leading-relaxed">
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {record.research && record.research.length > 0 && (
        <section className="space-y-4 border-t border-zinc-800 pt-8">
          <h2 className="text-lg font-medium">Research used</h2>
          <div className="space-y-3">
            {record.research.map((r, i) => (
              <details
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
              >
                <summary className="cursor-pointer text-sm">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-medium mr-2">
                    {r.label}
                  </span>
                  <span className="text-zinc-400">
                    &ldquo;{r.query}&rdquo;
                  </span>
                </summary>
                <div className="mt-2 space-y-2">
                  {r.answer && (
                    <div className="text-xs text-zinc-300 leading-relaxed">
                      {r.answer}
                    </div>
                  )}
                  {r.sources.length > 0 && (
                    <ul className="text-[11px] text-zinc-500 list-disc list-inside space-y-0.5">
                      {r.sources.map((s, j) => (
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
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <footer className="pt-12 pb-4 text-xs text-zinc-600">
        Generated by{" "}
        <a href="/" className="text-emerald-400 hover:underline">
          clawsout
        </a>{" "}
        — turn any content into a realistic podcast.
      </footer>
    </main>
  );
}
