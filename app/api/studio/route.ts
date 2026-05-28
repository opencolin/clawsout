import { NextRequest, NextResponse } from "next/server";
import { createStudioProject } from "@/lib/elevenlabs";
import { classifyError, missingKeyError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  name: string;
  scriptText: string;
  defaultVoiceId: string;
  narratorVoiceId: string;
  byoKey?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const apiKey = body.byoKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      const c = missingKeyError("elevenlabs");
      return NextResponse.json(
        {
          error: c.message,
          code: c.code,
          provider: c.provider,
          needsByoKey: true,
        },
        { status: 402 },
      );
    }
    if (!body.name || !body.scriptText) {
      return NextResponse.json(
        { error: "name and scriptText required" },
        { status: 400 },
      );
    }

    const project = await createStudioProject({
      apiKey,
      name: body.name,
      scriptText: body.scriptText,
      defaultVoiceId: body.defaultVoiceId,
      narratorVoiceId: body.narratorVoiceId,
    });
    return NextResponse.json(project);
  } catch (err: unknown) {
    const c = classifyError(err, "elevenlabs");
    return NextResponse.json(
      {
        error: c.message,
        code: c.code,
        provider: c.provider,
        needsByoKey: c.needsByoKey,
      },
      { status: c.needsByoKey ? 402 : 502 },
    );
  }
}
