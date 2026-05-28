const ELEVEN_TTS_MODEL = "eleven_v3";
const ELEVEN_FALLBACK_MODEL = "eleven_multilingual_v2";

const V3_SUPPORTED_TAGS = new Set([
  "laughs",
  "laugh",
  "laughing",
  "chuckles",
  "chuckle",
  "chuckling",
  "giggles",
  "giggle",
  "sighs",
  "sigh",
  "exhales",
  "exhale",
  "inhales",
  "gasps",
  "gasp",
  "whispers",
  "whisper",
  "whispering",
  "shouts",
  "shouting",
  "cries",
  "crying",
  "sobbing",
  "snorts",
  "snort",
  "coughs",
  "cough",
  "clears throat",
  "sniffs",
  "yawns",
  "pauses",
  "pause",
  "long pause",
  "slowly",
  "quickly",
  "happy",
  "sad",
  "angry",
  "excited",
  "nervous",
  "confused",
  "confident",
  "calm",
  "sarcastic",
  "serious",
  "warm",
]);

export function stripUnsupportedTags(text: string): string {
  return text
    .replace(/\[([^\]]+)\]/g, (match, raw: string) => {
      const tag = raw.trim().toLowerCase();
      return V3_SUPPORTED_TAGS.has(tag) ? match : "";
    })
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function stripAllTags(text: string): string {
  return text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function callElevenTts(opts: {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId: string;
}): Promise<Response> {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": opts.apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: opts.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  );
}

export async function synthesizeLine(opts: {
  apiKey: string;
  voiceId: string;
  text: string;
}): Promise<ArrayBuffer> {
  const cleaned = stripUnsupportedTags(opts.text);

  let res = await callElevenTts({
    apiKey: opts.apiKey,
    voiceId: opts.voiceId,
    text: cleaned,
    modelId: ELEVEN_TTS_MODEL,
  });

  if (res.status === 400 || res.status === 404) {
    const probe = await res.clone().text();
    const looksLikeModelIssue = /model|eleven_v3|not\s+found|not\s+available/i.test(
      probe,
    );
    if (looksLikeModelIssue) {
      const stripped = stripAllTags(opts.text);
      res = await callElevenTts({
        apiKey: opts.apiKey,
        voiceId: opts.voiceId,
        text: stripped,
        modelId: ELEVEN_FALLBACK_MODEL,
      });
    }
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.arrayBuffer();
}

export function concatMp3(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    out.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return out.buffer;
}
