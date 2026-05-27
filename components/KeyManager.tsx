"use client";

import { useEffect, useState } from "react";
import type { LLMProvider } from "@/lib/types";
import { LLM_MODELS } from "@/lib/llm";

const LS_KEYS = {
  llmProvider: "clawsout.llmProvider",
  llmModel: "clawsout.llmModel",
  llmKey: "clawsout.llmKey",
  ttsKey: "clawsout.ttsKey",
  whisperKey: "clawsout.whisperKey",
} as const;

export type Keys = {
  llmProvider: LLMProvider;
  llmModel: string;
  llmKey: string;
  ttsKey: string;
  whisperKey: string;
};

export function loadKeys(): Keys {
  if (typeof window === "undefined") {
    return {
      llmProvider: "anthropic",
      llmModel: LLM_MODELS.anthropic[0].id,
      llmKey: "",
      ttsKey: "",
      whisperKey: "",
    };
  }
  const provider =
    (localStorage.getItem(LS_KEYS.llmProvider) as LLMProvider) || "anthropic";
  return {
    llmProvider: provider,
    llmModel:
      localStorage.getItem(LS_KEYS.llmModel) || LLM_MODELS[provider][0].id,
    llmKey: localStorage.getItem(LS_KEYS.llmKey) || "",
    ttsKey: localStorage.getItem(LS_KEYS.ttsKey) || "",
    whisperKey: localStorage.getItem(LS_KEYS.whisperKey) || "",
  };
}

export function effectiveWhisperKey(k: Keys): string {
  if (k.whisperKey) return k.whisperKey;
  if (k.llmProvider === "openai" && k.llmKey) return k.llmKey;
  return "";
}

export default function KeyManager({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (k: Keys) => void;
}) {
  const [keys, setKeys] = useState<Keys>(() => loadKeys());

  useEffect(() => {
    if (open) setKeys(loadKeys());
  }, [open]);

  const save = () => {
    localStorage.setItem(LS_KEYS.llmProvider, keys.llmProvider);
    localStorage.setItem(LS_KEYS.llmModel, keys.llmModel);
    localStorage.setItem(LS_KEYS.llmKey, keys.llmKey);
    localStorage.setItem(LS_KEYS.ttsKey, keys.ttsKey);
    localStorage.setItem(LS_KEYS.whisperKey, keys.whisperKey);
    onSaved(keys);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">API keys</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Keys are stored in your browser only. They&apos;re sent server-side
          per request, never logged.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              Script LLM
            </label>
            <div className="flex gap-2">
              <select
                value={keys.llmProvider}
                onChange={(e) => {
                  const p = e.target.value as LLMProvider;
                  setKeys({
                    ...keys,
                    llmProvider: p,
                    llmModel: LLM_MODELS[p][0].id,
                  });
                }}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
              <select
                value={keys.llmModel}
                onChange={(e) =>
                  setKeys({ ...keys, llmModel: e.target.value })
                }
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm"
              >
                {LLM_MODELS[keys.llmProvider].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              {keys.llmProvider === "anthropic" ? "Anthropic" : "OpenAI"} API key
            </label>
            <input
              type="password"
              value={keys.llmKey}
              onChange={(e) => setKeys({ ...keys, llmKey: e.target.value })}
              placeholder={
                keys.llmProvider === "anthropic" ? "sk-ant-..." : "sk-..."
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              ElevenLabs API key
            </label>
            <input
              type="password"
              value={keys.ttsKey}
              onChange={(e) => setKeys({ ...keys, ttsKey: e.target.value })}
              placeholder="sk_..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Get one at{" "}
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                elevenlabs.io
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              OpenAI key (Whisper audio transcription){" "}
              <span className="text-zinc-500 font-normal">
                optional
                {keys.llmProvider === "openai" ? ", auto-used from above" : ""}
              </span>
            </label>
            <input
              type="password"
              value={keys.whisperKey}
              onChange={(e) => setKeys({ ...keys, whisperKey: e.target.value })}
              placeholder={
                keys.llmProvider === "openai"
                  ? "uses the OpenAI key above unless you set one here"
                  : "sk-..."
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Required only when you upload audio or video files.
            </p>
          </div>
        </div>

        <button
          onClick={save}
          className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded py-2"
        >
          Save
        </button>
      </div>
    </div>
  );
}
