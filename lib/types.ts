export type Utterance = {
  speaker: string;
  text: string;
  timestamp?: string;
};

export type Transcript = {
  source:
    | "slack"
    | "discord"
    | "whatsapp"
    | "vtt"
    | "srt"
    | "plain"
    | "url"
    | "pdf"
    | "docx"
    | "rtf"
    | "html"
    | "markdown"
    | "audio"
    | "unknown";
  utterances: Utterance[];
  speakers: string[];
};

export type ProductionMode = "podcast" | "reenactment" | "documentary";

export type Voice = {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  description: string;
  goodFor: ("host" | "narrator" | "character")[];
};

export type SpeakerCast = Record<string, string>;

export type ScriptLine = {
  speaker: string;
  text: string;
};

export type Script = {
  title: string;
  showNotes: string;
  lines: ScriptLine[];
  drivingQuestion?: string;
  premise?: string;
};

export type GenerateRequest = {
  transcript: Transcript;
  mode: ProductionMode;
  guide?: string;
  clawsOut: number;
  cast: SpeakerCast;
  narratorVoiceId: string;
  model: string;
};

export type HostFrame = {
  name: string;
  recurringQuestion: string;
  angle: string;
  signatureMove?: string;
};

export const STARTER_HOST_FRAMES: HostFrame[] = [
  {
    name: "The Decision Lens",
    recurringQuestion: "What was the one decision everyone treated as obvious but wasn't?",
    angle: "Every episode hunts for the moment where a choice was made — and why it was made that way instead of another.",
    signatureMove: "End every episode with the hosts naming the decision they'd have made differently.",
  },
  {
    name: "The Gap Detector",
    recurringQuestion: "What did everyone in this source know but not say?",
    angle: "Look for the unstated assumption, the gap between what people wrote and what they did, the thing everyone saw but nobody flagged.",
  },
  {
    name: "The Human Cost",
    recurringQuestion: "Who bore the cost of this, and were they the ones who decided?",
    angle: "Follow the impact to the people furthest from the decision. Name them, even if they appear only briefly.",
  },
  {
    name: "No Frame",
    recurringQuestion: "",
    angle: "No recurring frame — each episode stands alone.",
  },
];
