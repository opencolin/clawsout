import type { Transcript, Utterance } from "../types";
import { isSlackExport, parseSlack } from "./slack";
import { isDiscordExport, parseDiscord } from "./discord";
import { isWhatsApp, parseWhatsApp } from "./whatsapp";
import { isVtt, parseVtt } from "./vtt";
import { isSrt, parseSrt } from "./srt";
import { parsePlain } from "./plain";
import { extractHtml } from "../extractors/html";

export function parseTranscript(
  text: string,
  hint?: Transcript["source"],
): Transcript {
  let utterances: Utterance[];
  let source: Transcript["source"];

  if (isSlackExport(text)) {
    utterances = parseSlack(text);
    source = "slack";
  } else if (isDiscordExport(text)) {
    utterances = parseDiscord(text);
    source = "discord";
  } else if (isWhatsApp(text)) {
    utterances = parseWhatsApp(text);
    source = "whatsapp";
  } else if (isVtt(text)) {
    utterances = parseVtt(text);
    source = "vtt";
  } else if (isSrt(text)) {
    utterances = parseSrt(text);
    source = "srt";
  } else {
    utterances = parsePlain(text);
    source = hint ?? "plain";
  }

  utterances = utterances.filter((u) => u.text.trim().length > 0);
  const speakers = Array.from(new Set(utterances.map((u) => u.speaker)));

  return { source, utterances, speakers };
}

export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (clawsout) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  const body = await res.text();
  if (ct.includes("text/html")) return extractHtml(body);
  return body;
}
