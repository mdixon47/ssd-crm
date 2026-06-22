import { Scene } from "../components/Scene";
import { StatCounter } from "../components/StatCounter";
import { KineticText } from "../components/KineticText";

/** Proof — animated metrics. Replace placeholders with verified numbers. */
export const Proof: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => (
  <Scene durationInFrames={durationInFrames}>
    {(scale) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 56 * scale,
          width: "100%",
        }}
      >
        <KineticText text="More qualified leads. Less wasted spend." size={50} scale={scale} weight={700} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 70 * scale,
          }}
        >
          <StatCounter to={3} suffix="x" label="More qualified leads" scale={scale} delay={12} />
          <StatCounter to={42} suffix="%" label="Lower cost per lead" scale={scale} delay={20} />
          <StatCounter to={9} label="Pipeline stages tracked" scale={scale} delay={28} />
        </div>
      </div>
    )}
  </Scene>
);
