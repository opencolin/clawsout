import type { Utterance } from "../types";

type SlackMessage = {
  type?: string;
  subtype?: string;
  user?: string;
  username?: string;
  user_profile?: { real_name?: string; display_name?: string };
  text?: string;
  ts?: string;
  bot_profile?: { name?: string };
};

export function isSlackExport(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.some(
      (m) =>
        m && typeof m === "object" && "ts" in m && ("text" in m || "user" in m)
    );
  } catch {
    return false;
  }
}

function displayName(msg: SlackMessage): string {
  if (msg.user_profile?.display_name) return msg.user_profile.display_name;
  if (msg.user_profile?.real_name) return msg.user_profile.real_name;
  if (msg.username) return msg.username;
  if (msg.bot_profile?.name) return msg.bot_profile.name;
  if (msg.user) return msg.user;
  return "Unknown";
}

function cleanSlackText(text: string): string {
  return text
    .replace(/<@([A-Z0-9]+)\|([^>]+)>/g, "@$2")
    .replace(/<@([A-Z0-9]+)>/g, "")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:\/\/[^>]+)>/g, "$1")
    .replace(/:\w+:/g, "")
    .replace(/```[\s\S]*?```/g, "[code snippet]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n+/g, " ")
    .trim();
}

export function parseSlack(text: string): Utterance[] {
  const parsed = JSON.parse(text);
  const messages: SlackMessage[] = Array.isArray(parsed) ? parsed : [parsed];

  return messages
    .filter(
      (m) =>
        m &&
        (m.type === "message" || !m.type) &&
        !m.subtype &&
        m.text &&
        m.text.trim().length > 0
    )
    .map((m) => ({
      speaker: displayName(m),
      text: cleanSlackText(m.text!),
      timestamp: m.ts,
    }))
    .filter((u) => u.text.length > 0);
}
