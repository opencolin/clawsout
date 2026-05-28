"use client";

import { useEffect, useRef, useState } from "react";

export type SavedPodcastSummary = {
  slug: string;
  title: string;
  savedAt: string;
};

const LS_KEY = "clawsout.savedPodcasts";
const MAX_REMEMBERED = 100;

export function loadSavedPodcasts(): SavedPodcastSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is SavedPodcastSummary =>
        Boolean(p && typeof p.slug === "string" && typeof p.title === "string"),
    );
  } catch {
    return [];
  }
}

export function rememberSavedPodcast(p: SavedPodcastSummary): void {
  const list = loadSavedPodcasts().filter((x) => x.slug !== p.slug);
  list.unshift(p);
  localStorage.setItem(
    LS_KEY,
    JSON.stringify(list.slice(0, MAX_REMEMBERED)),
  );
  window.dispatchEvent(new Event("clawsout:saved-podcasts-changed"));
}

export function forgetSavedPodcast(slug: string): void {
  const list = loadSavedPodcasts().filter((x) => x.slug !== slug);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("clawsout:saved-podcasts-changed"));
}

export default function SavedPodcasts() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SavedPodcastSummary[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setList(loadSavedPodcasts());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("clawsout:saved-podcasts-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("clawsout:saved-podcasts-changed", refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (list.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded text-zinc-300"
      >
        My podcasts ({list.length})
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-40 max-h-96 overflow-y-auto">
          <div className="p-1.5">
            {list.map((p) => (
              <div
                key={p.slug}
                className="group flex items-center gap-1"
              >
                <a
                  href={`/p/${p.slug}`}
                  className="flex-1 block px-3 py-2 hover:bg-zinc-800 rounded text-sm min-w-0"
                >
                  <div className="text-zinc-200 truncate">{p.title}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {new Date(p.savedAt).toLocaleDateString()}
                  </div>
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(`Remove "${p.title}" from your list? (The shared link will still work.)`)
                    ) {
                      forgetSavedPodcast(p.slug);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 px-2 transition-opacity"
                  aria-label={`forget ${p.title}`}
                  title="Remove from list"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
