export async function transcribeAudio(opts: {
  file: File;
  apiKey: string;
  language?: string;
}): Promise<string> {
  const form = new FormData();
  form.append("file", opts.file);
  form.append("model", "whisper-1");
  form.append("response_format", "text");
  if (opts.language) form.append("language", opts.language);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${opts.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper ${res.status}: ${err.slice(0, 300)}`);
  }
  return await res.text();
}

export const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4", "mpeg", "mpga"] as const;

export function isAudioFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}
