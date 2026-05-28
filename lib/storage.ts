import { put, list } from "@vercel/blob";
import type { ResearchFinding } from "./research";

export type PodcastRecord = {
  slug: string;
  title: string;
  showNotes: string;
  lines: { speaker: string; text: string }[];
  audioUrl: string;
  savedAt: string;

  mode: "podcast" | "reenactment" | "documentary";
  clawsOut: number;
  model?: string;
  hostNames?: { a: string; b: string };
  cast?: Record<string, string>;
  narratorVoiceId?: string;

  research?: ResearchFinding[];

  sourceExcerpt?: string;
  sourceFormat?: string;
  speakerCount?: number;
  utteranceCount?: number;
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Vercel Blob is not configured. Go to your Vercel project → Storage → Create a Blob store, then redeploy.",
    );
    this.name = "StorageNotConfiguredError";
  }
}

function detectMissingToken(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /BLOB_READ_WRITE_TOKEN|No token found|Vercel Blob/i.test(msg);
}

export async function savePodcast(opts: {
  record: PodcastRecord;
  audio: ArrayBuffer | Buffer | Blob;
}): Promise<{ slug: string; audioUrl: string; metadataUrl: string }> {
  const { slug } = opts.record;
  try {
    const audioResult = await put(`podcasts/${slug}/audio.mp3`, opts.audio, {
      access: "public",
      contentType: "audio/mpeg",
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    const enriched: PodcastRecord = {
      ...opts.record,
      audioUrl: audioResult.url,
    };

    const metaResult = await put(
      `podcasts/${slug}/metadata.json`,
      JSON.stringify(enriched),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
      },
    );

    return {
      slug,
      audioUrl: audioResult.url,
      metadataUrl: metaResult.url,
    };
  } catch (err: unknown) {
    if (detectMissingToken(err)) throw new StorageNotConfiguredError();
    throw err;
  }
}

export async function loadPodcast(slug: string): Promise<PodcastRecord | null> {
  try {
    const result = await list({
      prefix: `podcasts/${slug}/metadata.json`,
      limit: 1,
    });
    if (result.blobs.length === 0) return null;
    const res = await fetch(result.blobs[0].url, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PodcastRecord;
  } catch (err: unknown) {
    if (detectMissingToken(err)) throw new StorageNotConfiguredError();
    return null;
  }
}
