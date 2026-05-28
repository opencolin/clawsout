"use client";

import { useEffect, useRef, useState } from "react";

type Line = { speaker?: string; text?: string };

function formatScriptForCopy(
  title?: string,
  showNotes?: string,
  lines?: Line[],
): string {
  const parts: string[] = [];
  if (title?.trim()) parts.push(title.trim());
  if (showNotes?.trim()) parts.push(showNotes.trim());
  for (const line of lines ?? []) {
    if (line.speaker && line.text) {
      parts.push(`${line.speaker}: ${line.text.trim()}`);
    }
  }
  return parts.join("\n\n");
}

type Editable = {
  onTitleChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onLineChange: (index: number, text: string) => void;
};

export default function ScriptStream({
  title,
  showNotes,
  lines,
  streaming,
  editable,
}: {
  title?: string;
  showNotes?: string;
  lines?: Line[];
  streaming: boolean;
  editable?: Editable;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!streaming || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [lines, streaming]);

  const safeLines = lines ?? [];
  const canEdit = Boolean(editable) && !streaming;
  const hasContent = safeLines.length > 0 || Boolean(title || showNotes);

  const copyScript = async () => {
    const text = formatScriptForCopy(title, showNotes, safeLines);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {streaming ? (
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-zinc-800 flex items-center gap-2 text-xs">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 font-medium uppercase tracking-wider">
            Writing
          </span>
          <span className="text-zinc-500 ml-auto tabular-nums">
            {safeLines.length} line{safeLines.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : hasContent ? (
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-3 text-xs">
          {canEdit && (
            <span className="text-zinc-500 hidden sm:inline">
              Click any line to edit.
            </span>
          )}
          <button
            onClick={copyScript}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
              copied
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-300"
            }`}
            aria-label="copy script to clipboard"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy script</span>
              </>
            )}
          </button>
          <span className="text-zinc-500 ml-auto tabular-nums">
            {safeLines.length} line{safeLines.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      <div ref={containerRef} className="max-h-[28rem] overflow-y-auto p-5 space-y-4">
        {canEdit && editable ? (
          <EditableInput
            value={title ?? ""}
            onChange={editable.onTitleChange}
            placeholder="Episode title"
            className="text-xl font-semibold tracking-tight w-full bg-transparent focus:outline-none focus:bg-zinc-800/50 rounded px-2 py-1 -mx-2 hover:bg-zinc-800/30"
          />
        ) : title ? (
          <h3 className="text-xl font-semibold tracking-tight">
            {title}
            {streaming && !showNotes && <BlinkingCursor />}
          </h3>
        ) : streaming ? (
          <h3 className="text-xl font-semibold text-zinc-700">
            <BlinkingCursor />
          </h3>
        ) : null}

        {canEdit && editable ? (
          <EditableTextarea
            value={showNotes ?? ""}
            onChange={editable.onNotesChange}
            placeholder="Show notes…"
            className="text-sm text-zinc-400 leading-relaxed w-full bg-transparent focus:outline-none focus:bg-zinc-800/50 rounded px-2 py-1 -mx-2 hover:bg-zinc-800/30 resize-none"
          />
        ) : showNotes ? (
          <p className="text-sm text-zinc-400 leading-relaxed">
            {showNotes}
            {streaming && safeLines.length === 0 && <BlinkingCursor />}
          </p>
        ) : null}

        {safeLines.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            {safeLines.map((line, i) => {
              const isLast = i === safeLines.length - 1;
              return (
                <div key={i}>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 font-medium">
                    {line.speaker || "…"}
                  </div>
                  {canEdit && editable ? (
                    <EditableTextarea
                      value={line.text ?? ""}
                      onChange={(v) => editable.onLineChange(i, v)}
                      placeholder="Line text"
                      className="text-sm text-zinc-200 leading-relaxed w-full bg-transparent focus:outline-none focus:bg-zinc-800/50 rounded px-2 py-1 -mx-2 hover:bg-zinc-800/30 resize-none"
                    />
                  ) : (
                    <div className="text-sm text-zinc-200 leading-relaxed">
                      {line.text || ""}
                      {streaming && isLast && <BlinkingCursor />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
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

function EditableInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      spellCheck
    />
  );
}

function EditableTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      rows={1}
      spellCheck
    />
  );
}
