# video.md — How-Tos & AI Keys

Practical guide for the SSD Consulting Remotion video pipeline (in `marketing/video/`)
and the API keys involved in an AI-assisted video workflow.

> This is a **self-contained React/Remotion** project. It does **not** import or run the
> Nuxt CRM app — it only lives in the same repo and reuses the brand colors.

---

## Part 1 — How-Tos

### Setup (one time)

```bash
cd marketing/video
npm install
# If the shared npm cache throws EACCES, use a local cache:
# npm install --cache /tmp/npm-cache
```

Requires Node 22+ (tested on Node 25). First render auto-downloads a headless Chrome.

### Preview & edit visually

```bash
npm run studio          # Remotion Studio: live preview, scrub timeline, tweak props
```

Open the printed `localhost` URL. Pick a composition in the left sidebar.

### Render videos

| Command | Output |
|---|---|
| `npm run render:wide` | `out/ssd-hero-wide.mp4` (16:9 — YouTube / landing) |
| `npm run render:vertical` | `out/ssd-hero-vertical.mp4` (9:16 — Reels / TikTok / Shorts) |
| `npm run render:square` | `out/ssd-hero-square.mp4` (1:1 — LinkedIn / B2B) |
| `npm run render:all` | all three hero formats |
| `npm run render:hookpack` | 3× 9:16 hook A/B variants |
| `npm run render:adcut` | 6s retargeting bumper (9:16 + 1:1) |
| `npm run still` | PNG poster frame |

Output lands in `out/` (git-ignored).

### How to change the script / copy

Edit the text in the scene files — no rebuild step, Studio hot-reloads:

| Want to change… | Edit |
|---|---|
| Opening hook | `src/scenes/Hook.tsx` (or add a variant in `src/Root.tsx`) |
| Value line | `src/scenes/Value.tsx` |
| The 3 pillars | `src/scenes/Pillars.tsx` |
| Metrics | `src/scenes/Proof.tsx` ⚠️ *use verified numbers* |
| Call to action | `src/scenes/CTA.tsx` |
| Brand colors | `src/theme.ts` (mirror of `nuxt.config.ts`) |
| Scene timing | `src/HeroAd.tsx` (`sec(n)`) |

### How to add a new hook variant (A/B test)

Append one object to `HOOK_VARIANTS` in `src/Root.tsx`:

```ts
{ id: "D-Question", hook: {
    kicker: "Quick Question",
    headline: "Who's actually following up on your leads?",
    kickerColor: brand.accentLight,
} }
```

It registers automatically as `HookPack-D-Question`. Render with `npx remotion render HookPack-D-Question out/hook-d.mp4`.

### How to add a new output format

Add a `<Composition>` in `src/Root.tsx` with new `width`/`height`. Layout auto-scales
off the shorter edge (`scaleFor` in `theme.ts`), so no redesign needed.

### Before publishing (checklist)

- [ ] Replace placeholder metrics in `Proof.tsx` with verified results.
- [ ] Add captions (most social plays muted).
- [ ] Add licensed background music/VO (renders are currently silent).
- [ ] Swap the CSS wordmark in `Logo.tsx` for final SVG/PNG art via `staticFile()`.

---

## Part 2 — AI Keys

The video pipeline itself needs **no API key** to render. Keys come in when you use AI to
*generate or enhance* content (scripts, voiceover, B-roll). All keys live in the repo-root
`.env` (copy from `.env.example`) — **never commit real keys**.

### Already configured in this project

| Key | Service | Relevance to video |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude (Anthropic) | Generate/refine ad scripts, hook variants, captions. Get it at <https://console.anthropic.com>. Format: `sk-ant-...` |
| `GOOGLE_ADS_*` | Google Ads API | Pull real performance numbers to put *verified* metrics in `Proof.tsx` |
| `META_*` | Meta Marketing API | Same, for Facebook/Instagram results |
| `LINKEDIN_*` | LinkedIn Marketing API | Same, for LinkedIn results |
| `RESEND_API_KEY` | Resend | Email the rendered video links to your team/clients |

### Optional — add these for an AI media workflow (not yet in `.env.example`)

Add only what you use; mark each optional and keep mock/manual fallbacks.

| Key (suggested name) | Service | Use |
|---|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs | AI voiceover / narration track. <https://elevenlabs.io> |
| `OPENAI_API_KEY` | OpenAI | Alt script gen, Whisper for auto-captions, TTS |
| `REPLICATE_API_TOKEN` | Replicate | AI B-roll / image generation for backgrounds |
| `PEXELS_API_KEY` | Pexels | Free stock footage/photos to drop in via `staticFile()` |

### Key hygiene

- Keys live in `.env` (git-ignored) — **never** hard-code them in `src/`.
- Remotion renders client-side React, so **do not** reference secret keys inside
  `src/**` components — they'd be bundled into the output. Use AI keys only in
  **build-time scripts** (Node) that generate assets *before* rendering, then pass
  results in via Remotion input props or `staticFile()`.
- For CI/cron renders, store keys as GitHub Actions secrets (same pattern as
  `NUXT_CRON_SECRET` / `APP_URL` in `.github/workflows/cron-publish.yml`).

### Example: AI-generate hook variants with Claude (build-time)

```bash
# from repo root, ANTHROPIC_API_KEY set in .env
node --env-file=.env -e '
import("@anthropic-ai/sdk").then(async ({default: A}) => {
  const c = new A();
  const m = await c.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 400,
    messages: [{ role: "user", content:
      "Write 3 punchy <9-word video hooks for SSD Consulting, a paid-acquisition agency. Return JSON: [{kicker,headline}]." }],
  });
  console.log(m.content[0].text);
});'
```

Paste the results into `HOOK_VARIANTS` in `src/Root.tsx`, then `npm run render:hookpack`.

---

## See also

- [`README.md`](README.md) — project structure & composition reference
- [`../video-marketing-strategy.md`](../video-marketing-strategy.md) — channels, calendar, funnel, measurement
