import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { brand } from "../theme";

/** Value proposition — reframe to the outcome SSD delivers. */
export const Value: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => (
  <Scene durationInFrames={durationInFrames}>
    {(scale) => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * scale }}>
        <KineticText text="SSD Consulting turns" size={64} scale={scale} weight={600} color={brand.textSoft} />
        <KineticText
          text="paid traffic into pipeline."
          size={96}
          scale={scale}
          weight={900}
          color={brand.accentLight}
          delay={9}
        />
      </div>
    )}
  </Scene>
);
