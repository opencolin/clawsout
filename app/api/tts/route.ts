import { NextRequest, NextResponse } from "next/server";
import { synthesizeLine, concatMp3 } from "@/lib/tts";
import { HOST_A_VOICE, HOST_B_VOICE, DEFAULT_NARRATOR_VOICE } from "@/lib/voices";

export const runtime = "nodejs";
export const maxDuration = 300;

type Body = {
  lines: { speaker: string; text: string }[];
  cast: Record<string, string>;
  narratorVoiceId: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ELEVENLABS_API_KEY not configured on the server. Add it in Vercel project env vars.",
        },
        { status: 500 },
      );
    }

    const body = (await req.json()) as Body;
    if (!body.lines?.length) {
      return NextResponse.json({ error: "no lines to synthesize" }, { status: 400 });
    }

    const buffers: ArrayBuffer[] = [];
    for (const line of body.lines) {
      const voiceId = resolveVoice(line.speaker, body.cast, body.narratorVoiceId);
      const audio = await synthesizeLine({
        apiKey,
        voiceId,
        text: line.text,
      });
      buffers.push(audio);
    }

    const merged = concatMp3(buffers);
    return new NextResponse(merged, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-disposition": 'attachment; filename="podcast.mp3"',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function resolveVoice(
  speaker: string,
  cast: Record<string, string>,
  narratorVoiceId: string,
): string {
  const upper = speaker.toUpperCase().trim();
  if (upper === "NARRATOR") return narratorVoiceId;
  if (upper === "HOST_A" || upper === "HOST A") return HOST_A_VOICE;
  if (upper === "HOST_B" || upper === "HOST B") return HOST_B_VOICE;
  if (cast[speaker]) return cast[speaker];

  const ciKey = Object.keys(cast).find(
    (k) => k.toLowerCase() === speaker.toLowerCase(),
  );
  if (ciKey) return cast[ciKey];

  return narratorVoiceId || DEFAULT_NARRATOR_VOICE;
}
