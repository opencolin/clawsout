import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPodcast, StorageNotConfiguredError } from "@/lib/storage";
import PodcastViewerClient from "./PodcastViewerClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const record = await loadPodcast(slug);
    if (!record) return { title: "Podcast not found — clawsout" };
    return {
      title: `${record.title} — clawsout`,
      description: record.showNotes || `A podcast generated with clawsout.`,
      openGraph: {
        title: record.title,
        description: record.showNotes,
        type: "music.song",
        audio: record.audioUrl
          ? [{ url: record.audioUrl, type: "audio/mpeg" }]
          : undefined,
      },
      twitter: {
        card: "summary",
        title: record.title,
        description: record.showNotes,
      },
    };
  } catch {
    return { title: "clawsout" };
  }
}

export default async function PodcastPage({ params }: PageProps) {
  const { slug } = await params;
  let record;
  try {
    record = await loadPodcast(slug);
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return (
        <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-16">
          <a
            href="/"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← clawsout
          </a>
          <h1 className="text-2xl font-semibold mt-8">Storage not configured</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Vercel Blob isn&apos;t enabled on this project yet. The owner needs
            to go to Vercel → Storage → Create Blob to turn this on.
          </p>
        </main>
      );
    }
    throw err;
  }

  if (!record) notFound();
  return <PodcastViewerClient record={record} />;
}
