import { callLLM, extractJson, DEFAULT_MODEL, type BYOKeys } from "./llm";
import type { ProductionMode } from "./types";

export type Beat = {
  index: number;
  function: "hook" | "context" | "turn" | "payoff" | "reflection";
  mode: "anecdote" | "reflection";
  anchor: string;
  notes?: string;
};

export type BeatSheet = {
  theme: string;
  drivingQuestion: string;
  premise: string;
  beats: Beat[];
};

const BEAT_SCHEMA_HINT = `{
  "theme": "3-5 word noun phrase for the episode",
  "drivingQuestion": "the one real open question from the source",
  "premise": "one sentence: what this episode argues or reveals",
  "beats": [
    {"index": 0, "function": "hook", "mode": "anecdote", "anchor": "exact quote or moment from source", "notes": "optional director note"}
  ]
}`;

const PLAN_PROMPT = (source: string, mode: ProductionMode, clawsOut: number) =>
  `You are a podcast story producer. Your job is to plan, not write.

Given the source below, produce a BEAT SHEET: a structured outline of 5-9 beats that will guide dialogue writing.

SOURCE:
${source.slice(0, 8000)}

MODE: ${mode}, CLAWS-OUT LEVEL: ${clawsOut}/10

RULES:
- Every beat must be ANCHORED to a real moment, quote, or fact in the source. No invented beats.
- Beat functions: hook (first image + promise), context (background), turn (complication or revelation), payoff (the beat that lands the premise), reflection (meaning/takeaway). Include at least one turn and one reflection.
- Mode alternates: pair anecdote beats with reflection beats. Never run 3 anecdotes in a row without a reflection.
- The driving question must be planted at beat 1-2 and resolved or deliberately complicated at the final beat.
- If the source is mundane, the beat sheet is short (5 beats) and grounded. Do NOT invent drama.

Return ONLY valid JSON matching this shape:
${BEAT_SCHEMA_HINT}`;

export async function planBeatSheet(opts: {
  transcript: string;
  mode: ProductionMode;
  clawsOut: number;
  model?: string;
  byoKeys?: BYOKeys;
}): Promise<BeatSheet | null> {
  try {
    const raw = await callLLM({
      model: opts.model ?? DEFAULT_MODEL,
      prompt: PLAN_PROMPT(opts.transcript, opts.mode, opts.clawsOut),
      byoKeys: opts.byoKeys,
    });
    const parsed = extractJson(raw) as Partial<BeatSheet>;
    if (!parsed.beats || parsed.beats.length === 0) return null;
    return {
      theme: parsed.theme ?? "",
      drivingQuestion: parsed.drivingQuestion ?? "",
      premise: parsed.premise ?? "",
      beats: parsed.beats,
    };
  } catch {
    return null;
  }
}

export function formatBeatSheet(bs: BeatSheet): string {
  const lines = [
    `THEME: ${bs.theme}`,
    `PREMISE: ${bs.premise}`,
    `DRIVING QUESTION: ${bs.drivingQuestion}`,
    "",
    "BEAT SHEET — write dialogue that fills each beat in order:",
    ...bs.beats.map(b =>
      `  Beat ${b.index + 1} [${b.function.toUpperCase()} / ${b.mode}]: ${b.anchor}${b.notes ? ` — ${b.notes}` : ""}`
    ),
  ];
  return lines.join("\n");
}
