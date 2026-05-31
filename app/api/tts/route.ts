import { NextRequest, NextResponse } from "next/server";
import { synthesizeLine, concatMp3WithBreaths, voiceSettingsFor } from "@/lib/tts";
import { HOST_A_VOICE, HOST_B_VOICE, DEFAULT_NARRATOR_VOICE } from "@/lib/voices";
import { classifyError, missingKeyError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

type Body = {
  lines: { speaker: string; text: string }[];
  cast: Record<string, string>;
  narratorVoiceId: string;
  byoKey?: string;
  hostNames?: { a: string; b: string };
  clawsOut?: number;
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

    if (!body.lines?.length) {
      return NextResponse.json({ error: "no lines to synthesize" }, { status: 400 });
    }

    const voiceSettings = voiceSettingsFor(body.clawsOut ?? 5);

    const buffers: ArrayBuffer[] = [];
    for (const line of body.lines) {
      const voiceId = resolveVoice(
        line.speaker,
        body.cast,
        body.narratorVoiceId,
        body.hostNames,
      );
      const audio = await synthesizeLine({
        apiKey,
        voiceId,
        text: line.text,
        voiceSettings,
      });
      buffers.push(audio);
    }

    const speakerChanges = body.lines.slice(0, -1).map((line, i) =>
      line.speaker !== body.lines[i + 1].speaker
    );
    const merged = concatMp3WithBreaths(buffers, speakerChanges);
    return new NextResponse(merged, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-disposition": 'attachment; filename="podcast.mp3"',
      },
    });
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

function resolveVoice(
  speaker: string,
  cast: Record<string, string>,
  narratorVoiceId: string,
  hostNames?: { a: string; b: string },
): string {
  const upper = speaker.toUpperCase().trim();
  if (upper === "NARRATOR") return narratorVoiceId;

  if (hostNames) {
    const aUp = hostNames.a.toUpperCase().trim();
    const bUp = hostNames.b.toUpperCase().trim();
    if (upper === aUp) return HOST_A_VOICE;
    if (upper === bUp) return HOST_B_VOICE;
  }

  if (upper === "HOST_A" || upper === "HOST A") return HOST_A_VOICE;
  if (upper === "HOST_B" || upper === "HOST B") return HOST_B_VOICE;
  if (cast[speaker]) return cast[speaker];

  const ciKey = Object.keys(cast).find(
    (k) => k.toLowerCase() === speaker.toLowerCase(),
  );
  if (ciKey) return cast[ciKey];

  return narratorVoiceId || DEFAULT_NARRATOR_VOICE;
}
