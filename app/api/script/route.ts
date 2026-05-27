import { NextRequest, NextResponse } from "next/server";
import { scriptPrompt } from "@/lib/prompts";
import { callLLM, extractJson } from "@/lib/llm";
import type { ProductionMode, Script, Transcript, LLMProvider } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  transcript: Transcript;
  mode: ProductionMode;
  guide?: string;
  clawsOut?: number;
  provider: LLMProvider;
  model: string;
  apiKey: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.apiKey) {
      return NextResponse.json({ error: "missing LLM API key" }, { status: 400 });
    }

    const clawsOut = Math.max(0, Math.min(10, body.clawsOut ?? 3));
    const prompt = scriptPrompt(
      body.transcript,
      body.mode,
      body.guide,
      body.transcript.speakers,
      clawsOut,
    );

    const raw = await callLLM({
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      prompt,
    });

    const parsed = extractJson(raw) as Partial<Script> & {
      lines?: { speaker: string; text: string }[];
    };

    if (!parsed.lines || parsed.lines.length === 0) {
      return NextResponse.json(
        { error: "LLM returned no script lines", raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      title: parsed.title ?? "Untitled episode",
      showNotes: parsed.showNotes ?? "",
      lines: parsed.lines,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
