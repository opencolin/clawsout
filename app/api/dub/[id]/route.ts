import { NextRequest, NextResponse } from "next/server";
import { getDubbingStatus, getDubbingAudio } from "@/lib/elevenlabs";
import { classifyError, missingKeyError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const audio = url.searchParams.get("audio");
  const lang = url.searchParams.get("lang") || "";
  const byoKey = req.headers.get("x-byo-key") || "";
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

  try {
    if (audio === "1") {
      if (!lang) {
        return NextResponse.json({ error: "lang required" }, { status: 400 });
      }
      const buf = await getDubbingAudio({
        apiKey,
        dubbingId: id,
        languageCode: lang,
      });
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "content-disposition": `attachment; filename="podcast-${lang}.mp3"`,
        },
      });
    }

    const status = await getDubbingStatus({ apiKey, dubbingId: id });
    return NextResponse.json(status);
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
