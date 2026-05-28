"use client";

import AudioPlayer from "./AudioPlayer";

export default function Player({
  src,
  filename,
}: {
  src: string;
  filename: string;
}) {
  return (
    <div className="space-y-3">
      <AudioPlayer src={src} />
      <a
        href={src}
        download={`${filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "podcast"}.mp3`}
        className="inline-block px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-sm font-medium"
      >
        Download MP3
      </a>
    </div>
  );
}
