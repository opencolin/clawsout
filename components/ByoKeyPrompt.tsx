"use client";

import { useState } from "react";
import type { BYOProvider } from "@/lib/errors";
import { labelFor } from "@/lib/errors";

const KEY_HINTS: Record<BYOProvider, { placeholder: string; help: string; url: string }> = {
  anthropic: {
    placeholder: "sk-ant-...",
    help: "Get a key in your Anthropic Console.",
    url: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    placeholder: "sk-...",
    help: "Get a key in your OpenAI account.",
    url: "https://platform.openai.com/api-keys",
  },
  google: {
    placeholder: "AIza...",
    help: "Get a key in Google AI Studio.",
    url: "https://aistudio.google.com/app/apikey",
  },
  nebius: {
    placeholder: "ne_...",
    help: "Get a key from Nebius Studio.",
    url: "https://studio.nebius.com/?modal=create-account",
  },
  elevenlabs: {
    placeholder: "sk_...",
    help: "Get a key from ElevenLabs.",
    url: "https://elevenlabs.io/app/settings/api-keys",
  },
};

export type ByoKeyPromptProps = {
  provider: BYOProvider;
  reason: "insufficient_credits" | "missing_key";
  message: string;
  onSave: (key: string) => void;
  onCancel: () => void;
};

export default function ByoKeyPrompt({
  provider,
  reason,
  message,
  onSave,
  onCancel,
}: ByoKeyPromptProps) {
  const [value, setValue] = useState("");
  const hint = KEY_HINTS[provider];
  const label = labelFor(provider);

  const headline =
    reason === "insufficient_credits"
      ? `${label} is out of credits on the server`
      : `${label} isn't configured on the server`;

  return (
    <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-amber-200">{headline}</h3>
        <p className="text-xs text-amber-300/70 mt-1 leading-relaxed">
          {message}
        </p>
        <p className="text-xs text-zinc-400 mt-2">
          Paste your own {label} API key to continue. Stored only in this
          browser.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hint.placeholder}
          autoFocus
          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSave(value.trim());
          }}
        />
        <button
          disabled={!value.trim()}
          onClick={() => onSave(value.trim())}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded text-sm font-medium"
        >
          Save &amp; retry
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-300 rounded text-sm"
        >
          Cancel
        </button>
      </div>

      <p className="text-[11px] text-zinc-500">
        {hint.help}{" "}
        <a
          href={hint.url}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Open {label} →
        </a>
      </p>
    </div>
  );
}
