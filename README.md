# clawsout

Turn any transcript into a realistic multi-voice podcast — with a comedy dial that goes claws out.

**Live at <https://clawsout.ai>** · [Repo](https://github.com/opencolin/clawsout)

Paste a Slack export, a meeting `.vtt`, a PDF, a Word doc, a URL, or any audio file. clawsout detects the speakers, casts each one a distinct voice, writes a podcast script in one of three formats at the comedy intensity you want, and synthesizes audio you can play or download.

No accounts. No payment pages. Bring your own API keys — they stay in your browser. Pushes to `main` auto-deploy to production via Vercel.

## Three production modes

| Mode | What you get | Best for |
|---|---|---|
| **Reenactment** | AI voices perform the original participants, with a narrator for scene-setting | Slack threads, meetings, depositions |
| **Documentary** | A narrator drives the story; real participants appear as ~20-second "clips" | Archival or investigative content |
| **Commentary** | Two AI hosts discuss the transcript, quoting participants by name | Explaining content to outsiders |

## Claws-out slider

A 0–10 dial controls the tone of the script:

| Level | Vibe | Audio tag usage |
|---|---|---|
| 0–1 | Professional / NPR-style | `[pauses]` only |
| 2–3 | Warm and conversational (default: 3) | `[laughs]`, `[sighs]` |
| 4–5 | Witty | Mild tags |
| 6–7 | Sharp comedy | `[scoffs]`, `[dramatic pause]` arrive |
| 8–9 | Claws out (reality-TV reunion energy) | `[eye-roll]`, `[chef's kiss]`, `[stage whisper]` |
| 10 | Maximum claws | Every line lands a beat; tag liberally |

The slider translates to specific tone instructions inserted into the LLM prompt — it doesn't just amplify a vibe, it changes the system's marching orders. Comedy stays observational; the prompts explicitly forbid punching down at identity, appearance, or vulnerabilities.

## Input formats

**Chat platforms**
- **Slack JSON exports** — handles user profiles, mentions, code blocks, emoji
- **Discord JSON exports** (e.g. DiscordChatExporter)
- **WhatsApp text exports** — `[DD/MM/YY, HH:MM] Name: text` and `DD/MM/YY, HH:MM - Name: text`

**Meeting transcripts**
- **WebVTT** — including `<v Speaker>...</v>` voice tags (closing tag optional)
- **SRT** — with optional `Name:` speaker prefixes
- **Plain text** — any `Name: said this` format. Smart inline splitting handles PDFs that lose line breaks (titles like `Dr.` are preserved correctly).

**Documents**
- **PDF** — via [unpdf](https://github.com/unjs/unpdf) (serverless-friendly)
- **DOCX** (Word) — via [mammoth](https://github.com/mwilliamson/mammoth.js)
- **RTF** — built-in stripper
- **Markdown** — strips syntax to clean prose
- **HTML files** — direct upload, not just URLs
- **URLs** — fetches and strips to text

**Audio & video**
- **MP3, WAV, M4A, MP4, WebM, OGG, FLAC** — transcribed via OpenAI Whisper (requires an OpenAI key in Settings)

## Quick start

```bash
git clone <this repo>
cd clawcast
npm install
npm run dev
```

Open <http://localhost:3000>, click **Settings**, paste your API keys, and start generating.

### Server env vars (production)

Set these in your Vercel project's Environment Variables panel — visitors don't need any keys of their own.

| Env var | Required for | Notes |
|---|---|---|
| `AI_GATEWAY_API_KEY` | Script generation | Auto-injected via OIDC on Vercel; only needed for local dev or non-Vercel hosting |
| `ELEVENLABS_API_KEY` | Voice synthesis | `sk_...` from [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys) |
| `OPENAI_API_KEY` | Audio/video transcription | Only needed if you accept audio uploads |

For local dev, run `vercel env pull .env.development.local` to grab a short-lived OIDC token plus your other configured vars.

> **Heads up:** with server-side keys, every visitor's generation bills your accounts. Set spend caps in Vercel AI Gateway, ElevenLabs, and OpenAI before traffic grows.

## Deploy

Vercel-ready. No env vars required:

```bash
vercel deploy
```

## Project layout

```
app/
  page.tsx              # Main UI
  layout.tsx
  globals.css
  api/
    parse/route.ts      # Detect format + extract speakers
    script/route.ts     # LLM script director
    tts/route.ts        # ElevenLabs synthesis + MP3 stitching
components/
  KeyManager.tsx        # BYO API key drawer
  Casting.tsx           # Speaker → voice assignment
  Player.tsx            # Audio + show notes + script reveal
lib/
  parsers/              # Slack / Discord / WhatsApp / VTT / SRT / plain
  extractors/           # PDF / DOCX / RTF / Markdown / HTML / audio (Whisper)
  prompts.ts            # The script director prompts (the magic)
  llm.ts                # Anthropic + OpenAI clients
  tts.ts                # ElevenLabs client + MP3 concat
  voices.ts             # Curated voice list + auto-cast logic
  types.ts
public/
  samples/              # Sample Slack export + meeting VTT
```

## How it works

1. **Parse** — auto-detect input format, extract `{speaker, text}` utterances
2. **Cast** — assign each detected speaker a distinct ElevenLabs voice (auto-cast on first parse, editable in UI)
3. **Script** — single LLM call with a mode-specific director prompt that returns structured JSON
4. **Synthesize** — per-line ElevenLabs synthesis, then MP3 concatenation server-side
5. **Play** — blob URL in the browser, download as MP3

## What's missing (intentionally)

- No voice cloning (yet — coming next; bring a 6-second sample)
- No music beds or transitions
- No multi-language UI (the LLM handles any language the transcript is in)
- No accounts, billing, dashboards, or quotas

## License

MIT
