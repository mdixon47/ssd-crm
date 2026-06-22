import { Composition } from "remotion";
import { HeroAd } from "./HeroAd";
import { AdCut } from "./AdCut";
import { brand, FPS, sec } from "./theme";
import { DEFAULT_HOOK, type HookContent } from "./scenes/Hook";

const DURATION = sec(20); // 20s hero
const CUT_DURATION = sec(6); // 6s retargeting bumper

/**
 * Hook A/B pack — same 20s body, three different opening hooks.
 * Test these head-to-head on short-form; hook drives most of the retention.
 * Variant A is the control: it reuses DEFAULT_HOOK so it always matches the
 * live hero ad (don't fork the copy, or the A/B comparison is invalid).
 */
const HOOK_VARIANTS: { id: string; hook: HookContent }[] = [
  {
    id: "A-Pain",
    hook: DEFAULT_HOOK,
  },
  {
    id: "B-Curiosity",
    hook: {
      kicker: "Before You Boost Again",
      headline: "Your best leads are slipping through the cracks.",
      kickerColor: brand.accentLight,
    },
  },
  {
    id: "C-Outcome",
    hook: {
      kicker: "Paid Acquisition",
      headline: "Turn ad spend into booked calls, not just clicks.",
      kickerColor: brand.google,
    },
  },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Hero ad — three native formats */}
      <Composition id="HeroAd-Wide" component={HeroAd} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
      <Composition id="HeroAd-Vertical" component={HeroAd} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="HeroAd-Square" component={HeroAd} durationInFrames={DURATION} fps={FPS} width={1080} height={1080} />

      {/* Hook A/B pack — vertical (primary short-form test surface) */}
      {HOOK_VARIANTS.map((v) => (
        <Composition
          key={v.id}
          id={`HookPack-${v.id}`}
          component={HeroAd}
          durationInFrames={DURATION}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{ hook: v.hook }}
        />
      ))}

      {/* 6s retargeting bumper — vertical + square */}
      <Composition id="AdCut-Vertical" component={AdCut} durationInFrames={CUT_DURATION} fps={FPS} width={1080} height={1920} />
      <Composition id="AdCut-Square" component={AdCut} durationInFrames={CUT_DURATION} fps={FPS} width={1080} height={1080} />
    </>
  );
};
