import { NextRequest } from "next/server";
import { runResearch } from "@/lib/research";
import { DEFAULT_MODEL, type BYOKeys } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  source: string;
  model?: string;
  byoKeys?: BYOKeys;
};

const ENCODER = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return ENCODER.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const source = body.source ?? "";
  const model = body.model ?? DEFAULT_MODEL;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
          controller.enqueue(
            sse("error", {
              error: "TAVILY_API_KEY not configured on the server.",
              skippable: true,
            }),
          );
          controller.close();
          return;
        }
        if (!source.trim()) {
          controller.enqueue(
            sse("error", { error: "no source content", skippable: true }),
          );
          controller.close();
          return;
        }

        const findings = await runResearch({
          source,
          tavilyKey,
          model,
          llmByoKeys: body.byoKeys,
          onEvent: (e) => controller.enqueue(sse(e.type, e)),
        });

        controller.enqueue(sse("done", { findings }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(sse("error", { error: msg, skippable: true }));
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
