import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { Pill } from "../components/Pill";
import { brand } from "../theme";

/** Three differentiators — the "how". */
export const Pillars: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => (
  <Scene durationInFrames={durationInFrames}>
    {(scale) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40 * scale,
          width: "100%",
        }}
      >
        <KineticText text="A system, not just spend." size={58} scale={scale} weight={800} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22 * scale,
            width: "100%",
            maxWidth: 760 * scale,
          }}
        >
          <Pill
            label="Google Ads + Social"
            sublabel="One team running every paid channel"
            color={brand.google}
            scale={scale}
            delay={14}
          />
          <Pill
            label="9-Stage Lead Pipeline"
            sublabel="Every lead tracked from click to close"
            color={brand.accent}
            scale={scale}
            delay={22}
          />
          <Pill
            label="AI Agents, 24/7"
            sublabel="Claude-powered follow-up & optimization"
            color={brand.ig}
            scale={scale}
            delay={30}
          />
        </div>
      </div>
    )}
  </Scene>
);
