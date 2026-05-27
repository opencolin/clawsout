import { generateText, type LanguageModel } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const TOKEN_FACTORY_BASE_URL = "https://api.tokenfactory.nebius.com/v1";

export type ModelProvider = "gateway" | "nebius";

export type ModelDef = {
  id: string;
  provider: ModelProvider;
  apiModel: string;
  label: string;
};

export const MODELS: ModelDef[] = [
  {
    id: "anthropic/claude-opus-4-5",
    provider: "gateway",
    apiModel: "anthropic/claude-opus-4-5",
    label: "Claude Opus 4.5 — highest quality",
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    provider: "gateway",
    apiModel: "anthropic/claude-sonnet-4-5",
    label: "Claude Sonnet 4.5 — balanced",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    provider: "gateway",
    apiModel: "anthropic/claude-haiku-4-5",
    label: "Claude Haiku 4.5 — fast",
  },
  {
    id: "openai/gpt-5",
    provider: "gateway",
    apiModel: "openai/gpt-5",
    label: "GPT-5",
  },
  {
    id: "openai/gpt-5-mini",
    provider: "gateway",
    apiModel: "openai/gpt-5-mini",
    label: "GPT-5 mini — fast",
  },
  {
    id: "google/gemini-2.5-pro",
    provider: "gateway",
    apiModel: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
  },
  {
    id: "nebius/kimi-k2.5",
    provider: "nebius",
    apiModel: "moonshot-ai/Kimi-K2.5",
    label: "Kimi K2.5 — 262K context, via Nebius",
  },
  {
    id: "nebius/deepseek-v3.2",
    provider: "nebius",
    apiModel: "deepseek-ai/DeepSeek-V3.2",
    label: "DeepSeek V3.2 — 163K context, via Nebius",
  },
  {
    id: "nebius/deepseek-r1",
    provider: "nebius",
    apiModel: "deepseek-ai/DeepSeek-R1-0528",
    label: "DeepSeek R1 — reasoning, via Nebius",
  },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

let nebiusProvider: ReturnType<typeof createOpenAICompatible> | null = null;
function nebiusModel(apiModel: string): LanguageModel {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEBIUS_API_KEY not configured on the server. Add it in Vercel project env vars to enable Nebius Token Factory models.",
    );
  }
  if (!nebiusProvider) {
    nebiusProvider = createOpenAICompatible({
      name: "nebius",
      baseURL: TOKEN_FACTORY_BASE_URL,
      apiKey,
    });
  }
  return nebiusProvider(apiModel);
}

export async function callLLM(opts: {
  model: string;
  prompt: string;
}): Promise<string> {
  const def =
    MODELS.find((m) => m.id === opts.model) ??
    MODELS.find((m) => m.id === DEFAULT_MODEL)!;

  const model: LanguageModel =
    def.provider === "nebius" ? nebiusModel(def.apiModel) : gateway(def.apiModel);

  const { text } = await generateText({
    model,
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
