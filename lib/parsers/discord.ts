import type { Utterance } from "../types";

type DiscordMessage = {
  type?: string;
  content?: string;
  timestamp?: string;
  author?: {
    name?: string;
    nickname?: string;
    isBot?: boolean;
  };
};

type DiscordExport = {
  messages?: DiscordMessage[];
};

export function isDiscordExport(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "messages" in parsed &&
      Array.isArray((parsed as DiscordExport).messages) &&
      (parsed as DiscordExport).messages!.length > 0 &&
      "author" in ((parsed as DiscordExport).messages![0] || {})
    );
  } catch {
    return false;
  }
}

function cleanDiscordText(text: string): string {
  return text
    .replace(/<@!?(\d+)>/g, "")
    .replace(/<#(\d+)>/g, "")
    .replace(/<:[a-zA-Z0-9_]+:\d+>/g, "")
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, "")
    .replace(/\|\|([^|]+)\|\|/g, "$1")
    .replace(/```[\s\S]*?```/g, "[code snippet]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

export function parseDiscord(text: string): Utterance[] {
  const parsed = JSON.parse(text) as DiscordExport;
  const messages = parsed.messages ?? [];

  return messages
    .filter(
      (m) =>
        (m.type === "Default" || m.type === "Reply" || !m.type) &&
        m.content &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      speaker:
        m.author?.nickname ||
        m.author?.name ||
        "Unknown",
      text: cleanDiscordText(m.content!),
      timestamp: m.timestamp,
    }))
    .filter((u) => u.text.length > 0);
}
