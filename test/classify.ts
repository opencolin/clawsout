// Regression tests for error classification.
// Run:  npm test    (uses tsx via package.json)
import { classifyError } from "../lib/errors.ts";

type Case = {
  name: string;
  err: Error;
  provider: "anthropic" | "openai" | "google" | "nebius" | "elevenlabs";
  expectNeedsByoKey: boolean;
  expectCode?: string;
};

const cases: Case[] = [
  {
    name: "ElevenLabs 401 quota_exceeded (real example)",
    err: new Error(
      'ElevenLabs 401: {"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 30000. You have 66 credits remaining, while 385 credits are required for this request.","status":"quota_exceeded","request_id":"543d994fb4afa14497c75733d5a25678"}}',
    ),
    provider: "elevenlabs",
    expectNeedsByoKey: true,
    expectCode: "insufficient_credits",
  },
  {
    name: "ElevenLabs voice_limit_reached",
    err: new Error("ElevenLabs 401: {\"detail\":{\"status\":\"voice_limit_reached\"}}"),
    provider: "elevenlabs",
    expectNeedsByoKey: true,
  },
  {
    name: "Anthropic 400 credit balance too low",
    err: Object.assign(new Error("Your credit balance is too low to access the Claude API."), {
      statusCode: 400,
    }),
    provider: "anthropic",
    expectNeedsByoKey: true,
  },
  {
    name: "OpenAI 429 insufficient_quota",
    err: Object.assign(
      new Error('OpenAI 429: {"error":{"code":"insufficient_quota","message":"You exceeded your current quota, please check your plan and billing details."}}'),
      { statusCode: 429 },
    ),
    provider: "openai",
    expectNeedsByoKey: true,
  },
  {
    name: "Gateway 402 payment required",
    err: Object.assign(new Error("AI Gateway: payment required"), { statusCode: 402 }),
    provider: "anthropic",
    expectNeedsByoKey: true,
  },
  {
    name: "Nebius insufficient credits",
    err: new Error("Nebius 402: {\"error\":\"insufficient credits, balance: 0.00\"}"),
    provider: "nebius",
    expectNeedsByoKey: true,
  },
  {
    name: "Invalid API key (auth, NOT credits)",
    err: Object.assign(new Error("Invalid API key provided"), { statusCode: 401 }),
    provider: "anthropic",
    expectNeedsByoKey: false,
    expectCode: "auth",
  },
  {
    name: "Generic 500 server error",
    err: Object.assign(new Error("Internal server error"), { statusCode: 500 }),
    provider: "openai",
    expectNeedsByoKey: false,
    expectCode: "other",
  },
  {
    name: "Plain rate limit (no credit phrasing)",
    err: Object.assign(new Error("Rate limit exceeded, please retry after 60s"), {
      statusCode: 429,
    }),
    provider: "openai",
    expectNeedsByoKey: false,
    expectCode: "rate_limit",
  },
];

let passed = 0;
let failed = 0;
for (const c of cases) {
  const r = classifyError(c.err, c.provider);
  const okByo = r.needsByoKey === c.expectNeedsByoKey;
  const okCode = !c.expectCode || r.code === c.expectCode;
  if (okByo && okCode) {
    console.log(`✓ ${c.name}`);
    passed++;
  } else {
    console.log(`✗ ${c.name}`);
    console.log(`    expected needsByoKey=${c.expectNeedsByoKey}${c.expectCode ? ` code=${c.expectCode}` : ""}`);
    console.log(`    got      needsByoKey=${r.needsByoKey} code=${r.code}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
