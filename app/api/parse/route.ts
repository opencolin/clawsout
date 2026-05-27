import { NextRequest, NextResponse } from "next/server";
import { parseTranscript, fetchUrlText } from "@/lib/parsers";
import { extractFile } from "@/lib/extractors";
import { transcribeAudio, isAudioFile } from "@/lib/extractors/audio";
import type { Transcript } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const FORMAT_TO_SOURCE: Record<string, Transcript["source"]> = {
  pdf: "pdf",
  docx: "docx",
  rtf: "rtf",
  html: "html",
  markdown: "markdown",
  audio: "audio",
};

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";

    let text = "";
    let hint: Transcript["source"] | undefined;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
      }

      if (isAudioFile(file.name)) {
        const whisperKey = process.env.OPENAI_API_KEY;
        if (!whisperKey) {
          return NextResponse.json(
            {
              error:
                "Audio transcription requires OPENAI_API_KEY on the server. Add it in Vercel project env vars.",
            },
            { status: 500 },
          );
        }
        const language = (form.get("language") as string) || undefined;
        text = await transcribeAudio({ file, apiKey: whisperKey, language });
        hint = "audio";
      } else {
        const extracted = await extractFile(file);
        text = extracted.text;
        hint = FORMAT_TO_SOURCE[extracted.format];
      }
    } else {
      const body = await req.json();
      text = body.text ?? "";
      if (body.url && !text) {
        text = await fetchUrlText(body.url);
        hint = "url";
      }
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "no extractable text in input" },
        { status: 400 },
      );
    }

    const transcript = parseTranscript(text, hint);
    if (transcript.utterances.length === 0) {
      return NextResponse.json(
        { error: "no utterances found in input" },
        { status: 400 },
      );
    }

    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
