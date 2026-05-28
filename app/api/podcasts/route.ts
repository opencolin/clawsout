import { NextRequest, NextResponse } from "next/server";
import {
  savePodcast,
  StorageNotConfiguredError,
  type PodcastRecord,
} from "@/lib/storage";
import { makePodcastSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const audio = form.get("audio");
    const metadataStr = form.get("metadata") as string | null;
    if (!(audio instanceof File) || !metadataStr) {
      return NextResponse.json(
        { error: "audio file and metadata JSON required" },
        { status: 400 },
      );
    }

    let metadata: Partial<PodcastRecord>;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      return NextResponse.json(
        { error: "invalid metadata JSON" },
        { status: 400 },
      );
    }

    if (!metadata.title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const slug = makePodcastSlug(metadata.title);
    const record: PodcastRecord = {
      slug,
      title: metadata.title,
      showNotes: metadata.showNotes ?? "",
      lines: metadata.lines ?? [],
      audioUrl: "",
      savedAt: new Date().toISOString(),
      mode: metadata.mode ?? "podcast",
      clawsOut: metadata.clawsOut ?? 3,
      model: metadata.model,
      hostNames: metadata.hostNames,
      cast: metadata.cast,
      narratorVoiceId: metadata.narratorVoiceId,
      research: metadata.research,
      sourceExcerpt: metadata.sourceExcerpt,
      sourceFormat: metadata.sourceFormat,
      speakerCount: metadata.speakerCount,
      utteranceCount: metadata.utteranceCount,
    };

    const result = await savePodcast({
      record,
      audio: await audio.arrayBuffer(),
    });

    return NextResponse.json({
      slug: result.slug,
      audioUrl: result.audioUrl,
      publicUrl: `/p/${result.slug}`,
    });
  } catch (err: unknown) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: err.message, code: "storage_not_configured" },
        { status: 503 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
