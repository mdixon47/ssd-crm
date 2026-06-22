import { AbsoluteFill, Series } from "remotion";
import "./font";
import { Background } from "./components/Background";
import { Hook, HookContent } from "./scenes/Hook";
import { Value } from "./scenes/Value";
import { Pillars } from "./scenes/Pillars";
import { Proof } from "./scenes/Proof";
import { CTA } from "./scenes/CTA";
import { sec } from "./theme";

export type HeroAdProps = {
  /** Override the opening hook for A/B variant packs (see Root.tsx). */
  hook?: HookContent;
};

/**
 * Single composition shared across 16:9 / 9:16 / 1:1.
 * Scenes auto-size off the shorter edge, so layout holds in every format.
 */
export const HeroAd: React.FC<HeroAdProps> = ({ hook }) => {
  return (
    <AbsoluteFill>
      <Background />
      <Series>
        <Series.Sequence durationInFrames={sec(3)}>
          <Hook durationInFrames={sec(3)} content={hook} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(4)}>
          <Value durationInFrames={sec(4)} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(5)}>
          <Pillars durationInFrames={sec(5)} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(4)}>
          <Proof durationInFrames={sec(4)} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(4)}>
          <CTA durationInFrames={sec(4)} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
