import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

export type GatewayModel = {
  id: string;
  label: string;
};

export const GATEWAY_MODELS: GatewayModel[] = [
  { id: "anthropic/claude-opus-4-5", label: "Claude Opus 4.5 — highest quality" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 — balanced" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5 — fast" },
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini — fast" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

export async function callLLM(opts: {
  model: string;
  prompt: string;
}): Promise<string> {
  const { text } = await generateText({
    model: gateway(opts.model),
    prompt: opts.prompt,
    maxOutputTokens: 8000,
  });
  return text;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object in response");
  return JSON.parse(body.slice(first, last + 1));
}
