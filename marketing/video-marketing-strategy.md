# SSD Consulting — Video Marketing Strategy

**Goal:** Generate qualified leads for SSD Consulting's paid-acquisition service
(we run clients' Google Ads + Social, tracked through a 9-stage pipeline with AI agents).

**Core insight:** We sell paid acquisition. Our own video funnel should *be the proof*
— if we can't make scroll-stopping, converting creative for ourselves, why would a
prospect trust us with their budget? The Remotion pipeline in [`video/`](video/) is
that proof: branded, on-message, reproducible at scale.

---

## 1. Audience & message

| | |
|---|---|
| **Who** | Founders / marketing leads at SMBs spending \$5k–\$50k/mo on ads with mediocre ROI |
| **Pain** | Budget burned on clicks that don't convert; no visibility from click → closed deal |
| **Promise** | "We turn paid traffic into pipeline" — a *system* (channels + 9-stage pipeline + AI follow-up), not just ad management |
| **Proof** | Tracked pipeline, AI agents working leads 24/7, lower cost-per-lead (use *verified* numbers) |
| **CTA** | Book a free acquisition audit → ssdconsulting.com |

**One-line positioning:** *Paid acquisition, run as a system — so every dollar is tracked from click to close.*

---

## 2. Channels & formats (what we're producing)

The Remotion project renders one ad in three native aspect ratios so each platform
gets a format-correct cut from a single source.

| Channel | Format | Comp ID | Purpose |
|---|---|---|---|
| Instagram Reels / TikTok / YouTube Shorts | 9:16 vertical | `HeroAd-Vertical` | Top-of-funnel reach, cold audiences |
| YouTube / website hero / sales demos | 16:9 wide | `HeroAd-Wide` | Mid-funnel, landing-page autoplay, YouTube pre-roll |
| LinkedIn / B2B feed | 1:1 square | `HeroAd-Square` | Decision-maker targeting, B2B credibility |

**Hook discipline (short-form):** the first 3 seconds must name the pain. Our Hook scene
("Burning budget on clicks that never convert?") does this. Test 3–5 hook variants per ad —
hook is the #1 driver of retention and CPM efficiency.

---

## 3. The video itself (current asset)

20-second hero ad, 30fps, 5 scenes:

1. **Hook (3s)** — name the pain.
2. **Value (4s)** — "SSD Consulting turns paid traffic into pipeline."
3. **Pillars (5s)** — Google Ads + Social · 9-stage pipeline · AI agents 24/7.
4. **Proof (4s)** — animated metrics. ⚠️ *Placeholder numbers — replace with verified results.*
5. **CTA (4s)** — book a free acquisition audit.

Renders: `cd marketing/video && npm install && npm run render:all` → `out/*.mp4`.

---

## 4. Content calendar (first 90 days)

A repeatable cadence beats one-off hero videos. Reuse the Remotion templates; vary copy.

| Week | Asset | Format(s) | Angle |
|---|---|---|---|
| 1 | Hero ad (this one) | all 3 | Brand intro + offer |
| 2 | Hook test pack | 9:16 ×3 | Same body, 3 different hooks (pain / curiosity / stat) |
| 3 | "How the 9-stage pipeline works" | 16:9 | Educational / authority |
| 4 | Client result / case study | 1:1, 16:9 | Social proof (real numbers) |
| 5 | "AI agents working leads 24/7" | 9:16 | Differentiator deep-dive |
| 6 | Founder POV / talking head intercut | 9:16 | Trust + personality |
| 7 | Objection handler ("is paid worth it in 2026?") | 1:1 | Mid-funnel nurture |
| 8 | 6s paid-ad cut of hero | 9:16, 1:1 | Retargeting bumper |
| 9–12 | Repeat best performers + 2 new hooks/wk | mixed | Double down on winners |

**Cadence target:** 2–3 organic shorts/week + always-on paid retargeting. Batch-render
weekly from updated scene copy.

---

## 5. Funnel & distribution

```
Cold short-form (9:16)         → reach / hook
   ↓ (viewers, profile visits, site clicks)
Retarget (6s cuts, 1:1/9:16)   → "book your audit"
   ↓
Landing page (16:9 hero autoplay) → audit booking form
   ↓
CRM 9-stage pipeline + AI agents → qualify, follow up, close
```

The CRM closes the loop: every video-sourced lead is tracked click → close, so we can
attribute creative to pipeline and **kill losers / scale winners** by real revenue, not vanity views.

---

## 6. Measurement

**Per-creative (platform):** 3s hook rate, avg watch %, CTR, CPM, cost/click.
**Per-channel (CRM):** leads created, cost per qualified lead, pipeline value, close rate, ROAS.

**Decision rule:** judge creative on **cost per qualified lead** (CRM), not views. A short
with low views but cheap qualified leads beats a viral one that converts no one.

**Cadence:** weekly creative review (cut bottom 20% hooks), monthly channel-mix review.

---

## 7. Production workflow

1. Draft/adjust copy in `marketing/video/src/scenes/*`.
2. Preview live: `npm run studio`.
3. Render all formats: `npm run render:all`.
4. Hook variants: duplicate the Hook scene copy, render a pack, A/B on platform.
5. Keep brand colors in `src/theme.ts` synced with `nuxt.config.ts`.
6. (Later) parameterize via Remotion input props for per-audience/offer variants and
   programmatic batch renders.

---

## 8. Guardrails

- **No unverified claims.** Replace placeholder metrics before any spend (legal + platform-policy risk).
- **Brand consistency.** All creative pulls from the shared theme tokens.
- **Accessibility.** Add captions (most social plays muted) — burn-in or platform SRT.
- **Music/sound.** Current renders are silent; add licensed audio + captions before publishing.

---

## Assets produced so far

| Asset | Compositions | Use |
|---|---|---|
| 20s hero ad | `HeroAd-Wide / -Vertical / -Square` | Brand intro + offer, all channels |
| Hook A/B pack | `HookPack-A-Pain / -B-Curiosity / -C-Outcome` (9:16) | Head-to-head hook test on short-form |
| 6s retargeting bumper | `AdCut-Vertical / -Square` | Meta/Google retargeting of warm viewers |

**Hook test plan:** run all three `HookPack-*` cuts to the same cold audience with equal
budget. Hook is the #1 lever on 3s-retention and CPM — keep the winner, retire the rest,
then write the next 2 hooks against the winning *angle*. Render: `npm run render:hookpack`.

**Retargeting:** serve `AdCut-*` only to people who watched ≥50% of a hero/hook ad or hit
the site. Short, assumes familiarity, drives straight to "book your audit." Render: `npm run render:adcut`.

## Next steps

- [ ] Replace placeholder metrics in `Proof.tsx` with verified results (or swap to testimonial).
- [ ] Add final SSD logo art (`src/assets/`, via `staticFile()`).
- [ ] Add captions + licensed background music.
- [x] Produce hook-variant pack and 6s retargeting cut.
- [ ] Launch first paid hook test; pick winner by cost per qualified lead (CRM).
