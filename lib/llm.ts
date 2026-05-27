import type { LLMProvider } from "./types";

export const LLM_MODELS: Record<LLMProvider, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-5", label: "Claude Opus 4.5 (highest quality)" },
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (balanced)" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast)" },
  ],
  openai: [
    { id: "gpt-5", label: "GPT-5 (highest quality)" },
    { id: "gpt-5-mini", label: "GPT-5 mini (balanced)" },
    { id: "gpt-4o", label: "GPT-4o (legacy)" },
  ],
};

export async function callLLM(opts: {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  prompt: string;
}): Promise<string> {
  if (opts.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 8000,
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${opts.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content: opts.prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object in response");
  return JSON.parse(body.slice(first, last + 1));
}
