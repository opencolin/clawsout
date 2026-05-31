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
