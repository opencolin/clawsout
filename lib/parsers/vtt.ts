import type { Utterance } from "../types";

export function isVtt(text: string): boolean {
  return text.trim().startsWith("WEBVTT");
}

export function parseVtt(text: string): Utterance[] {
  const blocks = text
    .replace(/^WEBVTT[\s\S]*?\n\n/, "")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const utterances: Utterance[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const timestampLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timestampLineIdx === -1) continue;

    const timestamp = lines[timestampLineIdx].split("-->")[0].trim();
    const contentLines = lines.slice(timestampLineIdx + 1).join(" ");

    const voiceMatch = contentLines.match(/<v\s+([^>]+?)>([\s\S]*?)(?:<\/v>|$)/);
    if (voiceMatch) {
      utterances.push({
        speaker: voiceMatch[1].trim(),
        text: stripTags(voiceMatch[2]).trim(),
        timestamp,
      });
      continue;
    }

    const colonMatch = contentLines.match(/^([A-Z][A-Za-z\s.'-]{1,40}):\s*(.+)/);
    if (colonMatch) {
      utterances.push({
        speaker: colonMatch[1].trim(),
        text: stripTags(colonMatch[2]).trim(),
        timestamp,
      });
      continue;
    }

    const cleaned = stripTags(contentLines).trim();
    if (cleaned) {
      utterances.push({
        speaker: "Speaker",
        text: cleaned,
        timestamp,
      });
    }
  }

  return mergeConsecutive(utterances);
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function mergeConsecutive(utterances: Utterance[]): Utterance[] {
  const merged: Utterance[] = [];
  for (const u of utterances) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === u.speaker) {
      last.text = `${last.text} ${u.text}`.trim();
    } else {
      merged.push({ ...u });
    }
  }
  return merged;
}
