import { generateText, streamObject, type LanguageModel } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import {
  classifyError,
  missingKeyError,
  type BYOProvider,
  type ClassifiedError,
} from "./errors";

export const ScriptSchema = z.object({
  title: z.string().describe("Episode title — short, evocative, no clickbait"),
  showNotes: z.string().describe("2-4 sentence description with the key beats"),
  lines: z.array(
    z.object({
      speaker: z
        .string()
        .describe("Speaker name from the transcript, or NARRATOR / HOST_A / HOST_B"),
      text: z.string().describe("The spoken line, written for the ear"),
    }),
  ),
});

export type ScriptObject = z.infer<typeof ScriptSchema>;
export type PartialScriptObject = {
  title?: string;
  showNotes?: string;
  lines?: { speaker?: string; text?: string }[];
};

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
    apiModel: "moonshotai/Kimi-K2.5",
    label: "Kimi K2.5 — 262K context, via Nebius",
  },
  {
    id: "nebius/kimi-k2-instruct",
    provider: "nebius",
    apiModel: "moonshotai/Kimi-K2-Instruct",
    label: "Kimi K2 Instruct — 131K context, via Nebius",
  },
  {
    id: "nebius/deepseek-v3.2",
    provider: "nebius",
    apiModel: "deepseek-ai/DeepSeek-V3.2",
    label: "DeepSeek V3.2 — 163K context, via Nebius",
  },
  {
    id: "nebius/glm-5",
    provider: "nebius",
    apiModel: "zai-org/GLM-5",
    label: "GLM 5 — Zhipu, via Nebius",
  },
  {
    id: "nebius/qwen-3.5",
    provider: "nebius",
    apiModel: "Qwen/Qwen3.5-397B-A17B",
    label: "Qwen 3.5 397B-A17B — via Nebius",
  },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

export type BYOKeys = Partial<Record<BYOProvider, string>>;

export class LLMError extends Error {
  constructor(public classified: ClassifiedError) {
    super(classified.message);
    this.name = "LLMError";
  }
}

export function modelDef(modelId: string): ModelDef {
  return (
    MODELS.find((m) => m.id === modelId) ??
    MODELS.find((m) => m.id === DEFAULT_MODEL)!
  );
}

export function modelByoProvider(def: ModelDef): BYOProvider {
  if (def.provider === "nebius") return "nebius";
  const prefix = def.apiModel.split("/")[0];
  if (prefix === "anthropic") return "anthropic";
  if (prefix === "openai") return "openai";
  if (prefix === "google") return "google";
  return "anthropic";
}

export async function callLLM(opts: {
  model: string;
  prompt: string;
  byoKeys?: BYOKeys;
}): Promise<string> {
  const def = modelDef(opts.model);
  const provider = modelByoProvider(def);
  const userKey = opts.byoKeys?.[provider];

  try {
    if (userKey) {
      return await callDirectProvider(def, opts.prompt, userKey);
    }

    if (def.provider === "nebius") {
      const envKey = process.env.NEBIUS_API_KEY;
      if (!envKey) throw new LLMError(missingKeyError("nebius"));
      return await callDirectProvider(def, opts.prompt, envKey);
    }

    const { text } = await generateText({
      model: gateway(def.apiModel),
      prompt: opts.prompt,
      maxOutputTokens: 8000,
    });
    return text;
  } catch (err: unknown) {
    if (err instanceof LLMError) throw err;
    throw new LLMError(classifyError(err, provider));
  }
}

export type HostNames = { a: string; b: string };

export async function* streamScript(opts: {
  model: string;
  prompt: string;
  byoKeys?: BYOKeys;
}): AsyncGenerator<PartialScriptObject, void, undefined> {
  const def = modelDef(opts.model);
  const provider = modelByoProvider(def);
  const userKey = opts.byoKeys?.[provider];

  try {
    if (userKey) {
      const text = await callDirectProvider(def, opts.prompt, userKey);
      const obj = extractJson(text) as ScriptObject;
      yield obj;
      return;
    }

    let model: LanguageModel;
    if (def.provider === "nebius") {
      const envKey = process.env.NEBIUS_API_KEY;
      if (!envKey) throw new LLMError(missingKeyError("nebius"));
      const nebius = createOpenAICompatible({
        name: "nebius",
        baseURL: TOKEN_FACTORY_BASE_URL,
        apiKey: envKey,
      });
      model = nebius(def.apiModel) as LanguageModel;
    } else {
      model = gateway(def.apiModel);
    }

    const result = streamObject({
      model,
      schema: ScriptSchema,
      prompt: opts.prompt,
      maxOutputTokens: 8000,
      temperature: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3,
    });

    for await (const partial of result.partialObjectStream) {
      yield partial as PartialScriptObject;
    }
  } catch (err: unknown) {
    if (err instanceof LLMError) throw err;
    throw new LLMError(classifyError(err, provider));
  }
}

async function callDirectProvider(
  def: ModelDef,
  prompt: string,
  apiKey: string,
): Promise<string> {
  if (def.provider === "nebius") {
    const nebius = createOpenAICompatible({
      name: "nebius",
      baseURL: TOKEN_FACTORY_BASE_URL,
      apiKey,
    });
    const { text } = await generateText({
      model: nebius(def.apiModel) as LanguageModel,
      prompt,
      maxOutputTokens: 8000,
    });
    return text;
  }

  const prefix = def.apiModel.split("/")[0];
  const bareModel = def.apiModel.slice(prefix.length + 1);

  if (prefix === "anthropic") {
    return callAnthropicDirect(bareModel, prompt, apiKey);
  }
  if (prefix === "openai") {
    return callOpenAIDirect(bareModel, prompt, apiKey);
  }
  if (prefix === "google") {
    return callGoogleDirect(bareModel, prompt, apiKey);
  }
  throw new Error(`No direct provider for ${def.apiModel}`);
}

async function callAnthropicDirect(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const e = new Error(`Anthropic ${res.status}: ${text.slice(0, 400)}`);
    (e as Error & { statusCode?: number }).statusCode = res.status;
    throw e;
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenAIDirect(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const e = new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
    (e as Error & { statusCode?: number }).statusCode = res.status;
    throw e;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGoogleDirect(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    const e = new Error(`Google ${res.status}: ${text.slice(0, 400)}`);
    (e as Error & { statusCode?: number }).statusCode = res.status;
    throw e;
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
