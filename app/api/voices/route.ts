import { NextRequest, NextResponse } from "next/server";
import { listUserVoices } from "@/lib/elevenlabs";
import { classifyError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const byoKey = req.headers.get("x-byo-key") || "";
  const apiKey = byoKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ voices: [], hasKey: false });
  }
  try {
    const all = await listUserVoices(apiKey);
    const voices = all.filter(
      (v) =>
        v.category === "cloned" ||
        v.category === "professional" ||
        v.category === "generated",
    );
    return NextResponse.json({ voices, hasKey: true });
  } catch (err: unknown) {
    const c = classifyError(err, "elevenlabs");
    return NextResponse.json(
      {
        voices: [],
        hasKey: true,
        error: c.message,
        code: c.code,
        needsByoKey: c.needsByoKey,
      },
      { status: c.needsByoKey ? 402 : 502 },
    );
  }
}
