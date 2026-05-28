const BASE = "https://api.elevenlabs.io/v1";

export type UserVoice = {
  voiceId: string;
  name: string;
  category: "cloned" | "professional" | "generated" | "premade" | string;
  description?: string;
  labels?: Record<string, string>;
};

function elError(res: Response, body: string, op: string): Error {
  const e = new Error(`ElevenLabs ${op} ${res.status}: ${body.slice(0, 400)}`);
  (e as Error & { statusCode?: number }).statusCode = res.status;
  return e;
}

export async function listUserVoices(apiKey: string): Promise<UserVoice[]> {
  const res = await fetch(`${BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) throw elError(res, await res.text(), "voices");
  const data = await res.json();
  const voices: UserVoice[] = (data.voices ?? []).map(
    (v: {
      voice_id: string;
      name: string;
      category?: string;
      description?: string;
      labels?: Record<string, string>;
    }) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category ?? "unknown",
      description: v.description,
      labels: v.labels,
    }),
  );
  return voices;
}

export async function startDubbing(opts: {
  apiKey: string;
  file: Blob;
  filename?: string;
  targetLang: string;
  sourceLang?: string;
  numSpeakers?: number;
}): Promise<string> {
  const form = new FormData();
  form.append("file", opts.file, opts.filename ?? "podcast.mp3");
  form.append("target_lang", opts.targetLang);
  if (opts.sourceLang) form.append("source_lang", opts.sourceLang);
  if (opts.numSpeakers != null) {
    form.append("num_speakers", String(opts.numSpeakers));
  }

  const res = await fetch(`${BASE}/dubbing`, {
    method: "POST",
    headers: { "xi-api-key": opts.apiKey },
    body: form,
  });
  if (!res.ok) throw elError(res, await res.text(), "dub start");
  const data = await res.json();
  return data.dubbing_id;
}

export type DubbingStatus = {
  status: "dubbing" | "dubbed" | "failed";
  targetLanguages?: string[];
  errorMessage?: string;
};

export async function getDubbingStatus(opts: {
  apiKey: string;
  dubbingId: string;
}): Promise<DubbingStatus> {
  const res = await fetch(`${BASE}/dubbing/${opts.dubbingId}`, {
    headers: { "xi-api-key": opts.apiKey },
  });
  if (!res.ok) throw elError(res, await res.text(), "dub status");
  const data = await res.json();
  return {
    status: data.status,
    targetLanguages: data.target_languages,
    errorMessage: data.error_message,
  };
}

export async function getDubbingAudio(opts: {
  apiKey: string;
  dubbingId: string;
  languageCode: string;
}): Promise<ArrayBuffer> {
  const res = await fetch(
    `${BASE}/dubbing/${opts.dubbingId}/audio/${opts.languageCode}`,
    { headers: { "xi-api-key": opts.apiKey } },
  );
  if (!res.ok) throw elError(res, await res.text(), "dub audio");
  return res.arrayBuffer();
}

export type StudioProject = {
  projectId: string;
  studioUrl: string;
};

export async function createStudioProject(opts: {
  apiKey: string;
  name: string;
  scriptText: string;
  defaultVoiceId: string;
  narratorVoiceId: string;
}): Promise<StudioProject> {
  const form = new FormData();
  form.append("name", opts.name);
  form.append("default_paragraph_voice_id", opts.defaultVoiceId);
  form.append("default_title_voice_id", opts.narratorVoiceId);
  form.append("default_model_id", "eleven_multilingual_v2");
  form.append(
    "from_document",
    new Blob([opts.scriptText], { type: "text/plain" }),
    "script.txt",
  );

  const res = await fetch(`${BASE}/studio/projects`, {
    method: "POST",
    headers: { "xi-api-key": opts.apiKey },
    body: form,
  });
  if (!res.ok) throw elError(res, await res.text(), "studio create");
  const data = await res.json();
  const projectId = data.project?.project_id ?? data.project_id;
  if (!projectId) throw new Error("Studio API returned no project id");
  return {
    projectId,
    studioUrl: `https://elevenlabs.io/app/studio/${projectId}`,
  };
}
