import { NextRequest, NextResponse } from "next/server";
import { loadPodcast, StorageNotConfiguredError } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  try {
    const record = await loadPodcast(slug);
    if (!record) {
      return NextResponse.json(
        { error: "podcast not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(record);
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
