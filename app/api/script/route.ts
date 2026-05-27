import { NextRequest, NextResponse } from "next/server";
import { scriptPrompt } from "@/lib/prompts";
import {
  callLLM,
  extractJson,
  DEFAULT_MODEL,
  LLMError,
  modelDef,
  modelByoProvider,
  type BYOKeys,
} from "@/lib/llm";
import type { ProductionMode, Script, Transcript } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  transcript: Transcript;
  mode: ProductionMode;
  guide?: string;
  clawsOut?: number;
  model?: string;
  byoKeys?: BYOKeys;
};

export async function POST(req: NextRequest) {
  let provider: ReturnType<typeof modelByoProvider> = "anthropic";

  try {
    const body = (await req.json()) as Body;
    const def = modelDef(body.model || DEFAULT_MODEL);
    provider = modelByoProvider(def);

    const clawsOut = Math.max(0, Math.min(10, body.clawsOut ?? 3));
    const prompt = scriptPrompt(
      body.transcript,
      body.mode,
      body.guide,
      body.transcript.speakers,
      clawsOut,
    );

    const raw = await callLLM({
      model: def.id,
      prompt,
      byoKeys: body.byoKeys,
    });

    const parsed = extractJson(raw) as Partial<Script> & {
      lines?: { speaker: string; text: string }[];
    };

    if (!parsed.lines || parsed.lines.length === 0) {
      return NextResponse.json(
        { error: "Model returned no script lines", raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      title: parsed.title ?? "Untitled episode",
      showNotes: parsed.showNotes ?? "",
      lines: parsed.lines,
    });
  } catch (err: unknown) {
    if (err instanceof LLMError) {
      return NextResponse.json(
        {
          error: err.classified.message,
          code: err.classified.code,
          provider: err.classified.provider,
          needsByoKey: err.classified.needsByoKey,
        },
        { status: err.classified.needsByoKey ? 402 : 502 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, provider }, { status: 500 });
  }
}
