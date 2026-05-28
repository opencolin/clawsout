const TAVILY_BASE = "https://api.tavily.com";

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

export type TavilySearchResponse = {
  answer?: string;
  query: string;
  results: TavilyResult[];
  response_time?: number;
};

export async function tavilySearch(opts: {
  apiKey: string;
  query: string;
  depth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean | "basic" | "advanced";
  timeRange?: "day" | "week" | "month" | "year";
  topic?: "general" | "news";
}): Promise<TavilySearchResponse> {
  const res = await fetch(`${TAVILY_BASE}/search`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${opts.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: opts.query,
      search_depth: opts.depth ?? "basic",
      max_results: opts.maxResults ?? 5,
      include_answer: opts.includeAnswer ?? "basic",
      topic: opts.topic ?? "general",
      ...(opts.timeRange ? { time_range: opts.timeRange } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const e = new Error(`Tavily ${res.status}: ${text.slice(0, 300)}`);
    (e as Error & { statusCode?: number }).statusCode = res.status;
    throw e;
  }
  return (await res.json()) as TavilySearchResponse;
}
