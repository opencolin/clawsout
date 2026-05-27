export type ErrorCode =
  | "insufficient_credits"
  | "missing_key"
  | "auth"
  | "rate_limit"
  | "other";

export type BYOProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "nebius"
  | "elevenlabs";

export type ClassifiedError = {
  code: ErrorCode;
  provider: BYOProvider | "unknown";
  message: string;
  needsByoKey: boolean;
};

const CREDIT_PATTERNS: RegExp[] = [
  /\binsufficient[\s_-]?(funds|credits?|balance|quota)\b/i,
  /\bquota[\s_-]?exceeded\b/i,
  /\bexceeds?\s+(your\s+)?(quota|usage|limit|monthly)/i,
  /\bcredits?\s+remaining\b/i,
  /\bcredits?\s+(are\s+)?required\s+for/i,
  /\b(usage|monthly|daily|hourly)\s+limit\s+(exceeded|reached)\b/i,
  /\b(out\s+of|no\s+more)\s+(credits?|funds|balance|tokens?)\b/i,
  /\bpayment[\s_-]?required\b/i,
  /\bsubscription[\s_-]?(expired|inactive|cancelled|required)\b/i,
  /\bcredit[\s_-]?balance[\s_-]?too[\s_-]?low\b/i,
  /\bfree[\s_-]?(quota|tier)[\s_-]?(exceeded|exhausted)\b/i,
  /\bcharacter[\s_-]?limit[\s_-]?reached\b/i,
  /\bvoice[\s_-]?limit[\s_-]?reached\b/i,
  /\bplan[\s_-]?limit/i,
  /\bbilling[\s_-]?(issue|problem|failed)\b/i,
  /\baccount[\s_-]?(suspended|disabled)\b/i,
  /\bquota_exceeded\b/i,
];

const AUTH_PATTERNS: RegExp[] = [
  /\binvalid[\s_-]?api[\s_-]?key\b/i,
  /\bincorrect[\s_-]?api[\s_-]?key\b/i,
  /\bunauthorized\b/i,
  /\bauthentication[\s_-]?failed\b/i,
  /\bmissing[\s_-]?(api|authentication)[\s_-]?key\b/i,
];

const RATE_LIMIT_PATTERNS: RegExp[] = [
  /\brate[\s_-]?limit/i,
  /\btoo[\s_-]?many[\s_-]?requests\b/i,
];

function extractStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  if (typeof e.statusCode === "number") return e.statusCode;
  if (typeof e.status === "number") return e.status;
  const m = e.message && typeof e.message === "string" ? e.message.match(/\b(4\d\d|5\d\d)\b/) : null;
  return m ? Number(m[1]) : undefined;
}

function extractText(err: unknown): string {
  if (err instanceof Error) {
    const e = err as Error & { responseBody?: unknown; cause?: unknown };
    const parts = [err.message];
    if (typeof e.responseBody === "string") parts.push(e.responseBody);
    if (e.cause instanceof Error) parts.push(e.cause.message);
    return parts.join(" ");
  }
  return String(err);
}

export function classifyError(
  err: unknown,
  provider: BYOProvider | "unknown",
): ClassifiedError {
  const text = extractText(err);
  const status = extractStatusCode(err);

  const isCredit =
    status === 402 ||
    CREDIT_PATTERNS.some((p) => p.test(text)) ||
    // Anthropic's 400 "credit balance is too low"
    (status === 400 && /credit\s+balance/i.test(text)) ||
    // ElevenLabs commonly returns 401 with quota messaging
    (status === 401 && /quota|credits?|subscription/i.test(text));

  if (isCredit) {
    return {
      code: "insufficient_credits",
      provider,
      message: cleanMessage(text),
      needsByoKey: true,
    };
  }

  if (AUTH_PATTERNS.some((p) => p.test(text)) || status === 401 || status === 403) {
    return {
      code: "auth",
      provider,
      message: cleanMessage(text),
      needsByoKey: false,
    };
  }

  if (status === 429 || RATE_LIMIT_PATTERNS.some((p) => p.test(text))) {
    return {
      code: "rate_limit",
      provider,
      message: cleanMessage(text),
      needsByoKey: false,
    };
  }

  return {
    code: "other",
    provider,
    message: cleanMessage(text),
    needsByoKey: false,
  };
}

export function missingKeyError(provider: BYOProvider): ClassifiedError {
  return {
    code: "missing_key",
    provider,
    message: `${labelFor(provider)} is not configured on the server.`,
    needsByoKey: true,
  };
}

export function labelFor(provider: BYOProvider | "unknown"): string {
  switch (provider) {
    case "anthropic":
      return "Anthropic";
    case "openai":
      return "OpenAI";
    case "google":
      return "Google Gemini";
    case "nebius":
      return "Nebius Token Factory";
    case "elevenlabs":
      return "ElevenLabs";
    default:
      return "the provider";
  }
}

function cleanMessage(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 400);
}
