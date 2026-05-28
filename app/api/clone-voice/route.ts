import { NextRequest, NextResponse } from "next/server";
import { cloneVoice } from "@/lib/voice-cloning";
import { classifyError, missingKeyError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "expected multipart/form-data" },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const name = ((form.get("name") as string) || "").trim();
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

    if (!name) {
      return NextResponse.json(
        { error: "voice name required" },
        { status: 400 },
      );
    }

    const files = form
      .getAll("file")
      .filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "no audio file uploaded" },
        { status: 400 },
      );
    }

    const cloned = await cloneVoice({ apiKey, name, files });
    return NextResponse.json(cloned);
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
