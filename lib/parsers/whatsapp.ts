import type { Utterance } from "../types";

const PATTERNS = [
  /^\[(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]\s+([^:]+?):\s+(.+)$/,
  /^(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\s*-\s+([^:]+?):\s+(.+)$/,
];

const SYSTEM_PHRASES = [
  "Messages and calls are end-to-end encrypted",
  "joined using this group's invite link",
  "added you",
  "added ",
  "left",
  "changed the subject",
  "changed this group's icon",
  "<Media omitted>",
  "image omitted",
  "video omitted",
  "audio omitted",
  "document omitted",
  "sticker omitted",
  "GIF omitted",
];

function isSystemMessage(text: string): boolean {
  return SYSTEM_PHRASES.some((p) => text.toLowerCase().includes(p.toLowerCase()));
}

export function isWhatsApp(text: string): boolean {
  const firstLines = text.split(/\r?\n/).slice(0, 20);
  let hits = 0;
  for (const line of firstLines) {
    if (PATTERNS.some((p) => p.test(line))) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

export function parseWhatsApp(text: string): Utterance[] {
  const lines = text.split(/\r?\n/);
  const utterances: Utterance[] = [];
  let current: Utterance | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let matched = false;
    for (const pat of PATTERNS) {
      const m = line.match(pat);
      if (m) {
        matched = true;
        const speaker = m[3].trim();
        const message = m[4].trim();
        if (isSystemMessage(message) || isSystemMessage(speaker)) {
          current = null;
          break;
        }
        if (current) utterances.push(current);
        current = {
          speaker,
          text: message,
          timestamp: `${m[1]} ${m[2]}`,
        };
        break;
      }
    }
    if (!matched && current) {
      current.text = `${current.text} ${line}`.trim();
    }
  }

  if (current) utterances.push(current);
  return utterances;
}
