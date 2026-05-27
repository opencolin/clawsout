import type { ProductionMode, Transcript } from "./types";

const SHARED_RULES = `
AUDIO TAG VOCABULARY:
- Mild: [laughs], [chuckles], [sighs], [exhales], [pauses], [whispers], [excited]
- Sharp: [scoffs], [snorts], [gasps], [under breath], [stage whisper], [eye-roll], [dramatic pause], [chef's kiss], [mock indignation]
- Use mild tags at low Claws-Out levels; bring in sharp tags only at higher levels. Never over-use — a podcast peppered with tags sounds robotic.

WRITING RULES:
- Write for the ear, not the page. Short sentences. Natural cadence.
- No headers, bullets, stage directions, or markdown — only spoken dialogue.
- Compress aggressively. Cut filler, repetition, and chitchat.
- Preserve punchlines, tension, and the actual decisions or insights.
- Numbers and acronyms: spell out anything that would sound odd ("two thousand twenty-five" not "2025" only if context demands).
- Never invent facts not in the transcript. If a fact is needed for cohesion, attribute it to the speaker or skip it.
- Comedy must be observational and shared — never punch down at individuals' identity, appearance, or vulnerabilities. Roast situations, choices, and contradictions; not people's worth.
`;

export function clawsOutLabel(level: number): string {
  if (level <= 1) return "Professional";
  if (level <= 3) return "Warm";
  if (level <= 5) return "Witty";
  if (level <= 7) return "Sharp";
  if (level <= 9) return "Claws out";
  return "MAXIMUM CLAWS";
}

function clawsOutBlock(level: number): string {
  const label = clawsOutLabel(level);
  if (level <= 1) {
    return `CLAWS-OUT LEVEL: ${level}/10 — ${label}
TONE: Neutral and respectful. NPR-style delivery. Zero jokes. Treat participants with full dignity. No audio tags beyond [pauses].`;
  }
  if (level <= 3) {
    return `CLAWS-OUT LEVEL: ${level}/10 — ${label}
TONE: Warm and conversational. Occasional dry wit is welcome but never at someone's expense. Light [laughs] and [sighs] only.`;
  }
  if (level <= 5) {
    return `CLAWS-OUT LEVEL: ${level}/10 — ${label}
TONE: Witty and engaging. Lean into the natural humor of the situation. Knowing observations about office dynamics or human absurdity are fine — stay observational, not personal. Mild audio tags welcome.`;
  }
  if (level <= 7) {
    return `CLAWS-OUT LEVEL: ${level}/10 — ${label}
TONE: Sharp and comedic. Embrace the absurdity. Call out tension, contradictions, and the universal awkwardness of meetings/chats. Roast the situation, not the people. Sharp tags like [scoffs] and [dramatic pause] earn their place here.`;
  }
  if (level <= 9) {
    return `CLAWS-OUT LEVEL: ${level}/10 — ${label}
TONE: This is a comedy podcast now. Treat the transcript like a reality-TV episode. Sass, dramatic pauses, exaggerated reactions, side-eye observations. Quote people's most ridiculous moments back at them with relish. Use sharp tags ([scoffs], [eye-roll], [chef's kiss], [stage whisper], [mock indignation]) where they punch up the line. Stay clever — never cruel, never punching down.`;
  }
  return `CLAWS-OUT LEVEL: ${level}/10 — ${label}
TONE: Maximum roast podcast energy. Treat every utterance as reality-TV reunion ammunition. Every host turn should land a beat — set up, observation, punchline. Embrace dramatic gasps, mock indignation, overwrought reactions. Use sharp tags liberally and with relish: [scoffs], [gasps], [eye-roll], [snorts], [chef's kiss], [stage whisper], [under breath], [dramatic pause]. The audience came for the drama — give it to them. Stay smart and observational; comedy works when it's shared, not when it targets people for their identity or vulnerabilities.`;
}

function transcriptBlock(transcript: Transcript): string {
  return transcript.utterances
    .map((u) => `${u.speaker}: ${u.text}`)
    .join("\n");
}

export function scriptPrompt(
  transcript: Transcript,
  mode: ProductionMode,
  guide: string | undefined,
  speakerLabels: string[],
  clawsOut: number,
): string {
  const guideBlock = guide?.trim()
    ? `\nUSER GUIDANCE (treat as a director's note):\n${guide.trim()}\n`
    : "";

  const tone = clawsOutBlock(clawsOut);
  const speakerList = speakerLabels.join(", ");

  if (mode === "reenactment") {
    return `You are a podcast producer turning a real conversation into a tight reenactment podcast.
The speakers in the transcript ARE the speakers in the podcast. Their voices will be performed by AI actors.

TRANSCRIPT:
${transcriptBlock(transcript)}

SPEAKERS YOU CAN USE: ${speakerList}, NARRATOR

${tone}
${guideBlock}
${SHARED_RULES}

MODE: REENACTMENT
- Keep the original speakers. Rewrite their lines for spoken delivery.
- Use NARRATOR only for scene-setting between exchanges (~15-30 seconds of narration between segments).
- Open with a 20-30 second NARRATOR cold-open hook: the most surprising or human moment first, then "Today on the show..."
- Compress 10x to 20x. Target output: 800-1500 spoken words (~5-10 minutes).
- End with NARRATOR delivering the takeaway in one line.

Return ONLY valid JSON in this shape:
{
  "title": "Episode title (short, evocative, no clickbait)",
  "showNotes": "2-4 sentence description with the key beats",
  "lines": [
    { "speaker": "NARRATOR" or one of the speaker names, "text": "the spoken line" }
  ]
}`;
  }

  if (mode === "documentary") {
    return `You are a documentary podcast producer. The original speakers' words appear as clips inside a narrator-driven story.

TRANSCRIPT:
${transcriptBlock(transcript)}

SPEAKERS YOU CAN USE: ${speakerList}, NARRATOR

${tone}
${guideBlock}
${SHARED_RULES}

MODE: DOCUMENTARY
- NARRATOR drives the arc: hook → context → escalation → turn → resolution → takeaway.
- Interleave 6-12 "clips" lifted (and lightly tightened) from the transcript — keep the speaker's voice authentic.
- A clip is a single utterance from one speaker, 10-25 seconds of spoken text.
- Open with a NARRATOR cold-open (30-45 seconds): pose a question or stake.
- Target output: 1000-2000 spoken words (~7-13 minutes).
- Each clip MUST attribute to a real speaker name from the transcript.

Return ONLY valid JSON in this shape:
{
  "title": "Episode title",
  "showNotes": "2-4 sentence description",
  "lines": [
    { "speaker": "NARRATOR" or one of the speaker names, "text": "the spoken line" }
  ]
}`;
  }

  return `You are a podcast producer creating a two-host commentary podcast about a real conversation.

TRANSCRIPT (raw conversation the hosts are discussing):
${transcriptBlock(transcript)}

YOUR HOSTS (the only speakers in the output): HOST_A, HOST_B

${tone}
${guideBlock}
${SHARED_RULES}

MODE: COMMENTARY
- Two hosts in the studio reacting to and analyzing the transcript above.
- They quote real participants by name ("So at one point, ${speakerLabels[0] ?? "Sam"} says...").
- Natural back-and-forth: agree, disagree, build on each other.
- Open with HOST_A teasing the most interesting moment ("Okay, you have to hear what happened in this meeting...").
- Each host's turn is 1-3 sentences before handing off. Avoid monologues.
- Target output: 1000-2000 spoken words (~7-13 minutes).
- End with one host delivering a clean takeaway.

Return ONLY valid JSON in this shape:
{
  "title": "Episode title",
  "showNotes": "2-4 sentence description",
  "lines": [
    { "speaker": "HOST_A" or "HOST_B", "text": "the spoken line" }
  ]
}`;
}
