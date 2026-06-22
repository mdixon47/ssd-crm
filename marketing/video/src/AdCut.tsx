import { AbsoluteFill, Series } from "remotion";
import "./font";
import { Background } from "./components/Background";
import { Scene } from "./components/Scene";
import { KineticText } from "./components/KineticText";
import { Logo } from "./components/Logo";
import { CtaButton } from "./components/CtaButton";
import { brand, fontFamilyBody, sec } from "./theme";

/**
 * 6-second retargeting bumper. Assumes the viewer has already seen us once,
 * so it skips the problem setup and goes straight to value + CTA.
 * Renders in 9:16 and 1:1 for Meta/Google retargeting placements.
 */
export const AdCut: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Series>
        <Series.Sequence durationInFrames={sec(3)}>
          <Scene durationInFrames={sec(3)}>
            {(scale) => (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * scale }}>
                <span
                  style={{
                    fontFamily: fontFamilyBody,
                    fontWeight: 700,
                    fontSize: 26 * scale,
                    letterSpacing: 4 * scale,
                    textTransform: "uppercase",
                    color: brand.accentLight,
                  }}
                >
                  Still comparing agencies?
                </span>
                <KineticText
                  text="Turn ad spend into pipeline."
                  size={92}
                  scale={scale}
                  weight={900}
                  color={brand.white}
                />
              </div>
            )}
          </Scene>
        </Series.Sequence>
        <Series.Sequence durationInFrames={sec(3)}>
          <Scene durationInFrames={sec(3)}>
            {(scale) => (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 * scale }}>
                <Logo scale={scale} delay={0} />
                <CtaButton label="Book your free audit →" scale={scale} delay={16} />
              </div>
            )}
          </Scene>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
