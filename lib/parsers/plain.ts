import type { Utterance } from "../types";

const SPEAKER_LINE = /^([A-Za-z][A-Za-z0-9 .'_-]{0,40}?)\s*[:>]\s*(.+)$/;
const TIMESTAMPED = /^\[?\d{1,2}:\d{2}(:\d{2})?\]?\s+([A-Za-z][A-Za-z0-9 .'_-]{0,40}?)\s*[:>]?\s*(.+)$/;

const NAME_TOKEN = "[A-Z][a-zA-Z]{1,20}";
const TITLE_WORDS = "(?:Dr|Mr|Mrs|Ms|Prof|Sir|Lord|Lady|Rev)";
const TITLE = `${TITLE_WORDS}\\.`;
const INLINE_SPEAKER_NAME = new RegExp(
  `(?:${TITLE}\\s+${NAME_TOKEN}|${NAME_TOKEN}(?:\\s+${NAME_TOKEN})?)`,
);

function normalizeInlineSpeakers(text: string): string {
  const pattern = new RegExp(
    `(?<!\\b${TITLE_WORDS})([.!?…])\\s+(${INLINE_SPEAKER_NAME.source}):\\s`,
    "g",
  );
  return text.replace(pattern, "$1\n$2: ");
}

export function parsePlain(text: string): Utterance[] {
  const normalized = normalizeInlineSpeakers(text);
  const lines = normalized.split(/\r?\n/);
  const utterances: Utterance[] = [];
  let current: Utterance | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const tsMatch = line.match(TIMESTAMPED);
    if (tsMatch) {
      if (current) utterances.push(current);
      current = {
        speaker: tsMatch[2].trim(),
        text: tsMatch[3].trim(),
      };
      continue;
    }

    const sMatch = line.match(SPEAKER_LINE);
    if (sMatch && looksLikeName(sMatch[1])) {
      if (current) utterances.push(current);
      current = {
        speaker: sMatch[1].trim(),
        text: sMatch[2].trim(),
      };
      continue;
    }

    if (current) {
      current.text = `${current.text} ${line}`.trim();
    } else {
      current = { speaker: "Narrator", text: line };
    }
  }

  if (current) utterances.push(current);
  return utterances;
}

function looksLikeName(s: string): boolean {
  if (s.length > 40) return false;
  if (/^(http|www\.|note|update|todo|fixme|warning|error|tip)/i.test(s)) return false;
  if (/\d{3,}/.test(s)) return false;
  return /^[A-Z]/.test(s);
}
