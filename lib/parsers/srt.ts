import type { Utterance } from "../types";

export function isSrt(text: string): boolean {
  return /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/m.test(text.trim());
}

export function parseSrt(text: string): Utterance[] {
  const blocks = text
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const utterances: Utterance[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 2) continue;

    const tsIdx = lines.findIndex((l) => l.includes("-->"));
    if (tsIdx === -1) continue;

    const timestamp = lines[tsIdx].split("-->")[0].trim();
    const content = lines.slice(tsIdx + 1).join(" ").trim();
    if (!content) continue;

    const colonMatch = content.match(/^([A-Z][A-Za-z\s.'-]{1,40}):\s*(.+)/);
    if (colonMatch) {
      utterances.push({
        speaker: colonMatch[1].trim(),
        text: colonMatch[2].trim(),
        timestamp,
      });
    } else {
      utterances.push({
        speaker: "Speaker",
        text: content,
        timestamp,
      });
    }
  }

  return utterances;
}
