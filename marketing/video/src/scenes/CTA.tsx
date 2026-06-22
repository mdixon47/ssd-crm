import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { Logo } from "../components/Logo";
import { CtaButton } from "../components/CtaButton";

/** Call to action — single clear next step. */
export const CTA: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  return (
    <Scene durationInFrames={durationInFrames}>
      {(scale) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 48 * scale,
          }}
        >
          <Logo scale={scale} delay={0} />
          <KineticText
            text="Book your free acquisition audit."
            size={62}
            scale={scale}
            weight={800}
            delay={8}
          />
          <CtaButton label="ssdconsulting.com →" scale={scale} delay={24} />
        </div>
      )}
    </Scene>
  );
};
