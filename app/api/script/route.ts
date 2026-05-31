import { NextRequest } from "next/server";
import { scriptPrompt } from "@/lib/prompts";
import { planBeatSheet, formatBeatSheet } from "@/lib/structure";
import {
  streamScript,
  DEFAULT_MODEL,
  LLMError,
  modelDef,
  modelByoProvider,
  type BYOKeys,
} from "@/lib/llm";
import type { HostFrame, ProductionMode, Transcript } from "@/lib/types";
import type { ResearchFinding } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  transcript: Transcript;
  mode: ProductionMode;
  guide?: string;
  clawsOut?: number;
  model?: string;
  byoKeys?: BYOKeys;
  hostNames?: { a: string; b: string };
  research?: ResearchFinding[];
  useBeatSheet?: boolean;
  hostFrame?: HostFrame;
};

const ENCODER = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return ENCODER.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  let provider: ReturnType<typeof modelByoProvider> = "anthropic";

  const body = (await req.json()) as Body;
  const def = modelDef(body.model || DEFAULT_MODEL);
  provider = modelByoProvider(def);

  const clawsOut = Math.max(0, Math.min(10, body.clawsOut ?? 3));
  const hostNames = body.hostNames ?? { a: "Rachel", b: "Adam" };

  // Two-pass: optional beat sheet planning before dialogue writing
  let beatSheetBlock = "";
  if (body.useBeatSheet !== false && body.mode === "documentary") {
    const sourceText = body.transcript.utterances
      .map((u) => `${u.speaker}: ${u.text}`)
      .join("\n");
    const bs = await planBeatSheet({
      transcript: sourceText,
      mode: body.mode,
      clawsOut,
      model: def.id,
      byoKeys: body.byoKeys,
    });
    if (bs) beatSheetBlock = formatBeatSheet(bs);
  }

  const guide = beatSheetBlock
    ? `BEAT SHEET (follow this arc — fill each beat with dialogue):\n${beatSheetBlock}\n\n${body.guide ?? ""}`
    : body.guide;

  const prompt = scriptPrompt(
    body.transcript,
    body.mode,
    guide,
    body.transcript.speakers,
    clawsOut,
    hostNames,
    body.research ?? [],
    body.hostFrame,
  );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const partial of streamScript({
          model: def.id,
          prompt,
          byoKeys: body.byoKeys,
        })) {
          controller.enqueue(sseEvent("partial", partial));
        }
        controller.enqueue(sseEvent("done", { ok: true }));
      } catch (err: unknown) {
        if (err instanceof LLMError) {
          controller.enqueue(
            sseEvent("error", {
              error: err.classified.message,
              code: err.classified.code,
              provider: err.classified.provider,
              needsByoKey: err.classified.needsByoKey,
            }),
          );
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            sseEvent("error", {
              error: msg,
              provider,
              needsByoKey: false,
            }),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
