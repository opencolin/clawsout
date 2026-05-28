import type { Voice, SpeakerCast } from "./types";

export const VOICES: Voice[] = [
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "male",
    accent: "American",
    description: "Deep, authoritative",
    goodFor: ["host", "narrator"],
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    gender: "female",
    accent: "American",
    description: "Warm, narrator-ready",
    goodFor: ["host", "narrator"],
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    gender: "male",
    accent: "British",
    description: "Deep documentary narrator",
    goodFor: ["narrator", "host"],
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    gender: "female",
    accent: "American",
    description: "Soft, conversational",
    goodFor: ["host", "character"],
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    gender: "male",
    accent: "American",
    description: "Casual, warm",
    goodFor: ["host", "character"],
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    gender: "female",
    accent: "American",
    description: "Confident, energetic",
    goodFor: ["host", "character"],
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    gender: "male",
    accent: "Australian",
    description: "Friendly, natural",
    goodFor: ["host", "character"],
  },
  {
    id: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    gender: "female",
    accent: "British",
    description: "Pleasant, articulate",
    goodFor: ["host", "character"],
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    gender: "male",
    accent: "British",
    description: "Smooth, refined",
    goodFor: ["host", "narrator"],
  },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    gender: "female",
    accent: "British",
    description: "Warm, approachable",
    goodFor: ["host", "character"],
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    gender: "male",
    accent: "American",
    description: "Articulate, mid-range",
    goodFor: ["host", "character"],
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    gender: "female",
    accent: "American",
    description: "Warm, expressive",
    goodFor: ["host", "character"],
  },
];

export function findVoice(id: string): Voice | undefined {
  return VOICES.find((v) => v.id === id);
}

const PRIORITY_ORDER = [
  "pNInz6obpgDQGcFmaJgB",
  "21m00Tcm4TlvDq8ikWAM",
  "ErXwobaYiN019PkySvjV",
  "EXAVITQu4vr4xnSDxMaL",
  "IKne3meq5aSn9XLyUdCD",
  "XB0fDUnXU5powFXDhCwa",
  "AZnzlk1XvdvUeBnXmlld",
  "JBFqnCBsd6RMkjVDRZzb",
  "TX3LPaxmHKxFdv7VOQHJ",
  "pFZP5JQG7iQjIQuC4Bku",
  "XrExE9yKIg1WjnnlVkGX",
  "onwK4e9ZLuTAKqWW03F9",
];

export function autoCast(speakers: string[]): SpeakerCast {
  const cast: SpeakerCast = {};
  speakers.forEach((speaker, i) => {
    cast[speaker] = PRIORITY_ORDER[i % PRIORITY_ORDER.length];
  });
  return cast;
}

export function defaultVoiceFor(
  speaker: string,
  allSpeakers: string[],
): string {
  const idx = allSpeakers.indexOf(speaker);
  return PRIORITY_ORDER[Math.max(0, idx) % PRIORITY_ORDER.length];
}

export const DEFAULT_NARRATOR_VOICE = "onwK4e9ZLuTAKqWW03F9";

export const HOST_A_VOICE = "21m00Tcm4TlvDq8ikWAM";
export const HOST_B_VOICE = "pNInz6obpgDQGcFmaJgB";

export const DEFAULT_HOST_A_NAME = "Rachel";
export const DEFAULT_HOST_B_NAME = "Adam";
