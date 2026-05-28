import { NextRequest, NextResponse } from "next/server";
import { startDubbing } from "@/lib/elevenlabs";
import { classifyError, missingKeyError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const targetLang = (form.get("target_lang") as string) || "";
    const sourceLang = (form.get("source_lang") as string) || undefined;
    const numSpeakers = form.get("num_speakers");
    const byoKey = (form.get("byoKey") as string) || "";

    const apiKey = byoKey || process.env.ELEVENLABS_API_KEY;
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
    if (!(file instanceof File) || !targetLang) {
      return NextResponse.json(
        { error: "file and target_lang required" },
        { status: 400 },
      );
    }

    const dubbingId = await startDubbing({
      apiKey,
      file,
      filename: file.name,
      targetLang,
      sourceLang,
      numSpeakers: numSpeakers ? Number(numSpeakers) : undefined,
    });
    return NextResponse.json({ dubbingId });
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
