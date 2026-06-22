# SSD Consulting — Marketing Video (Remotion)

Programmatic video for SSD Consulting marketing, built with [Remotion](https://www.remotion.dev/)
(code → MP4). **Self-contained:** this is a React project with its own dependencies and
does **not** touch the Nuxt CRM app. It just lives in the same repo for convenience.

## Why Remotion here

- One source of truth for every aspect ratio — write the ad once, render 16:9 / 9:16 / 1:1.
- Brand-locked: colors are mirrored from the Nuxt theme in [`src/theme.ts`](src/theme.ts).
- Versionable + reviewable: ads are code, so changes diff in git like everything else.
- Scales to data-driven variants later (per-offer, per-audience, A/B copy) via input props.

## Setup

```bash
cd marketing/video
npm install            # if the shared npm cache errors: npm install --cache /tmp/npm-cache
```

## Edit visually

```bash
npm run studio         # opens Remotion Studio — live preview + scrub timeline
```

## Render

```bash
npm run render:wide       # 1920x1080  → YouTube / website hero / demos     → out/ssd-hero-wide.mp4
npm run render:vertical   # 1080x1920  → Reels / TikTok / Shorts            → out/ssd-hero-vertical.mp4
npm run render:square     # 1080x1080  → LinkedIn / B2B feed                → out/ssd-hero-square.mp4
npm run render:all        # all three hero formats

npm run render:hookpack   # 3x 9:16 full ads, identical body, different opening hooks (A/B test)
npm run render:adcut      # 6s retargeting bumper → out/ssd-adcut-{vertical,square}.mp4
npm run still             # PNG thumbnail / poster frame
```

### Compositions

| ID | Size | Asset |
|---|---|---|
| `HeroAd-Wide` / `-Vertical` / `-Square` | 16:9 / 9:16 / 1:1 | 20s hero ad |
| `HookPack-A-Pain` / `-B-Curiosity` / `-C-Outcome` | 9:16 | Hook A/B variants (same body) |
| `AdCut-Vertical` / `-Square` | 9:16 / 1:1 | 6s retargeting bumper |

**Hook A/B pack:** three 20s ads that differ only in the opening 3s hook (pain /
curiosity / outcome). Run them head-to-head on short-form and keep the winner — the
hook drives most of the retention. Variants are defined in [`src/Root.tsx`](src/Root.tsx)
(`HOOK_VARIANTS`); add more by appending to that array.

Output lands in `out/` (git-ignored).

## Structure

```
src/
  Root.tsx              Registers all 8 compositions (hero ×3, hook pack ×3, ad cut ×2)
  HeroAd.tsx            Sequences the 5 scenes (20s hero)
  AdCut.tsx             6s retargeting bumper
  font.ts               Loads Inter (only the weights/subset used) — imported for side effect
  theme.ts              Brand tokens (mirror of Nuxt theme) + FPS/sec + scale helper
  components/           Background, KineticText, Logo, Pill, StatCounter, Scene, CtaButton
  scenes/               Hook → Value → Pillars → Proof → CTA
```

One `<HeroAd>` drives all three formats: elements size off the **shorter edge**
(`scaleFor` in `theme.ts`), so the layout holds in landscape, portrait, and square.

## Editing the message

- **Copy / script** — edit the text in each file under `src/scenes/`.
- **Brand colors** — `src/theme.ts` (kept in sync with `nuxt.config.ts`).
- **Logo** — `src/components/Logo.tsx` is a CSS wordmark; drop a real SVG/PNG into
  `src/assets/` and load it via Remotion's `staticFile()` when you have final art.
- **Timing** — scene durations live in `src/HeroAd.tsx` (`sec(n)`).

## ⚠️ Before publishing

`src/scenes/Proof.tsx` uses **placeholder metrics** ("3x more leads", "42% lower CPL").
Replace these with **verified** numbers, or swap the scene for a testimonial/feature
frame. Don't ship unverified performance claims in a paid ad.
