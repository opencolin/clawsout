export type ClonedVoice = {
  voiceId: string;
  name: string;
};

export async function cloneVoice(opts: {
  apiKey: string;
  name: string;
  files: File[];
  description?: string;
}): Promise<ClonedVoice> {
  const form = new FormData();
  form.append("name", opts.name);
  if (opts.description) {
    form.append("description", opts.description);
  }
  for (const f of opts.files) {
    form.append("files", f);
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": opts.apiKey },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    const e = new Error(
      `ElevenLabs clone ${res.status}: ${text.slice(0, 400)}`,
    );
    (e as Error & { statusCode?: number }).statusCode = res.status;
    throw e;
  }

  const data = await res.json();
  return { voiceId: data.voice_id, name: opts.name };
}

export async function deleteClonedVoice(opts: {
  apiKey: string;
  voiceId: string;
}): Promise<void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/voices/${opts.voiceId}`,
    {
      method: "DELETE",
      headers: { "xi-api-key": opts.apiKey },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs delete ${res.status}: ${text.slice(0, 300)}`);
  }
}
