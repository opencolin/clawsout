import { NextRequest, NextResponse } from "next/server";
import { scriptPrompt } from "@/lib/prompts";
import { callLLM, extractJson, DEFAULT_MODEL } from "@/lib/llm";
import type { ProductionMode, Script, Transcript } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  transcript: Transcript;
  mode: ProductionMode;
  guide?: string;
  clawsOut?: number;
  model?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const clawsOut = Math.max(0, Math.min(10, body.clawsOut ?? 3));
    const prompt = scriptPrompt(
      body.transcript,
      body.mode,
      body.guide,
      body.transcript.speakers,
      clawsOut,
    );

    const raw = await callLLM({
      model: body.model || DEFAULT_MODEL,
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
