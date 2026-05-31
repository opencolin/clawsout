import { callLLM, extractJson, DEFAULT_MODEL, type BYOKeys } from "./llm";
import { tavilySearch, type TavilyResult } from "./tavily";

export type ResearchAngle = {
  label: string;
  query: string;
  rationale?: string;
};

export type ResearchFinding = {
  label: string;
  query: string;
  answer: string;
  sources: { title: string; url: string; snippet: string }[];
  tension?: { note: string; sourceClaim: string };
};

export type ResearchEvent =
  | { type: "planning" }
  | { type: "planned"; angles: ResearchAngle[] }
  | { type: "searching"; index: number; angle: ResearchAngle }
  | { type: "found"; index: number; finding: ResearchFinding }
  | { type: "failed"; index: number; angle: ResearchAngle; error: string };

const PLAN_PROMPT = (sourceExcerpt: string) => `You are a research producer for a podcast. Given the source content below, propose THREE distinct research angles that would deepen a podcast about this material.

Each angle is a real-world search query (8-15 words) that would surface useful CONTEXT, BACKGROUND, or COUNTERPOINTS the source itself doesn't fully cover. The three angles should be COMPLEMENTARY, not overlapping.

Good angle examples:
- "Context": broader trend or industry the source sits within
- "Key players": background on people, companies, products mentioned in the source
- "Critical perspective": smartest critiques, counterpoints, or related controversies
- "Recent developments": what has changed in this space lately
- "Frameworks": established mental models that explain what the source describes

Pick the three most useful angles for THIS source. Don't force the labels above — invent labels that fit.

SOURCE EXCERPT:
${sourceExcerpt}

Return ONLY valid JSON in this exact shape:
{
  "angles": [
    {"label": "...", "query": "...", "rationale": "one short sentence on why this angle matters"},
    {"label": "...", "query": "...", "rationale": "..."},
    {"label": "...", "query": "...", "rationale": "..."}
  ]
}`;

const MAX_SOURCE_EXCERPT_CHARS = 6000;

function truncateSource(source: string): string {
  if (source.length <= MAX_SOURCE_EXCERPT_CHARS) return source;
  const head = source.slice(0, MAX_SOURCE_EXCERPT_CHARS - 1000);
  const tail = source.slice(-1000);
  return `${head}\n\n[... ${source.length - MAX_SOURCE_EXCERPT_CHARS} characters truncated ...]\n\n${tail}`;
}

export async function planResearchAngles(opts: {
  source: string;
  model?: string;
  byoKeys?: BYOKeys;
}): Promise<ResearchAngle[]> {
  const raw = await callLLM({
    model: opts.model ?? DEFAULT_MODEL,
    prompt: PLAN_PROMPT(truncateSource(opts.source)),
    byoKeys: opts.byoKeys,
  });
  const parsed = extractJson(raw) as { angles?: ResearchAngle[] };
  const angles = (parsed.angles ?? [])
    .filter(
      (a): a is ResearchAngle => Boolean(a && a.label && a.query),
    )
    .slice(0, 3);
  return angles;
}

function toSnippet(r: TavilyResult): { title: string; url: string; snippet: string } {
  const content = r.content || "";
  const snippet = content.length > 500 ? `${content.slice(0, 500)}…` : content;
  return { title: r.title, url: r.url, snippet };
}

export async function runResearch(opts: {
  source: string;
  tavilyKey: string;
  model?: string;
  llmByoKeys?: BYOKeys;
  onEvent?: (e: ResearchEvent) => void;
}): Promise<ResearchFinding[]> {
  opts.onEvent?.({ type: "planning" });
  const angles = await planResearchAngles({
    source: opts.source,
    model: opts.model,
    byoKeys: opts.llmByoKeys,
  });

  if (angles.length === 0) {
    return [];
  }

  opts.onEvent?.({ type: "planned", angles });

  const settled = await Promise.allSettled(
    angles.map(async (angle, index) => {
      opts.onEvent?.({ type: "searching", index, angle });
      try {
        const result = await tavilySearch({
          apiKey: opts.tavilyKey,
          query: angle.query,
          depth: "basic",
          maxResults: 5,
          includeAnswer: "basic",
        });
        const finding: ResearchFinding = {
          label: angle.label,
          query: angle.query,
          answer: result.answer ?? "",
          sources: result.results.slice(0, 5).map(toSnippet),
        };
        opts.onEvent?.({ type: "found", index, finding });
        return finding;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        opts.onEvent?.({ type: "failed", index, angle, error: msg });
        return null;
      }
    }),
  );

  const findings = settled
    .map((s) => (s.status === "fulfilled" ? s.value : null))
    .filter((f): f is ResearchFinding => f !== null);

  // Classify for contradictions
  if (findings.length > 0 && opts.source) {
    const sourceExcerpt = opts.source.slice(0, 3000);
    const findingsSummary = findings.map((f, i) =>
      `Finding ${i+1} (${f.label}): ${f.answer.slice(0, 300)}`
    ).join("\n\n");
    try {
      const raw = await callLLM({
        model: opts.model || DEFAULT_MODEL,
        prompt: `Does any research finding below materially contradict or complicate a specific claim in the source? Return JSON with a tensions array (max 2 items, each: { findingIndex: number, note: string, sourceClaim: string }). If no real contradiction exists, return { tensions: [] }. Bias strongly toward empty — only flag if there is a clear, citable, meaningful divergence. NEVER manufacture tension.\n\nSOURCE:\n${sourceExcerpt}\n\nRESEARCH FINDINGS:\n${findingsSummary}`,
        byoKeys: opts.llmByoKeys,
      });
      const parsed = extractJson(raw) as {
        tensions?: { findingIndex?: number; note?: string; sourceClaim?: string }[];
      };
      if (parsed && Array.isArray(parsed.tensions)) {
        for (const t of parsed.tensions) {
          if (typeof t.findingIndex === "number" && findings[t.findingIndex]) {
            findings[t.findingIndex].tension = {
              note: t.note ?? "",
              sourceClaim: t.sourceClaim ?? "",
            };
          }
        }
      }
    } catch {
      // classifier failure is non-fatal — continue without tensions
    }
  }

  return findings;
}
