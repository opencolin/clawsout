"use client";

import { useEffect, useRef } from "react";

type Line = { speaker?: string; text?: string };

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

  useEffect(() => {
    if (!streaming || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [lines, streaming]);

  const safeLines = lines ?? [];
  const canEdit = Boolean(editable) && !streaming;

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
      ) : canEdit ? (
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">
            Click any line to edit. Changes apply on the next{" "}
            <span className="text-emerald-300">Regenerate audio</span>.
          </span>
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
