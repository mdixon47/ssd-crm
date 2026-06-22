import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, fontFamilyBody } from "../theme";

/**
 * A glass "pillar" chip with an icon dot, label and sublabel.
 * Springs in from below; used in the Pillars scene.
 */
export const Pill: React.FC<{
  label: string;
  sublabel: string;
  color: string;
  scale: number;
  delay: number;
  width?: number | string;
}> = ({ label, sublabel, color, scale, delay, width = "auto" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 110, mass: 0.7 },
  });

  return (
    <div
      style={{
        width,
        display: "flex",
        alignItems: "center",
        gap: 20 * scale,
        padding: `${22 * scale}px ${28 * scale}px`,
        borderRadius: 18 * scale,
        background: `${brand.bgPanel}cc`,
        border: `${1.5 * scale}px solid ${color}55`,
        boxShadow: `0 ${12 * scale}px ${40 * scale}px rgba(0,0,0,0.45)`,
        backdropFilter: "blur(6px)",
        opacity: enter,
        transform: `translateX(${(1 - enter) * -40 * scale}px)`,
      }}
    >
      <div
        style={{
          width: 18 * scale,
          height: 18 * scale,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 ${18 * scale}px ${color}`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span
          style={{
            fontFamily: fontFamilyBody,
            fontWeight: 800,
            fontSize: 34 * scale,
            color: brand.white,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: fontFamilyBody,
            fontWeight: 500,
            fontSize: 22 * scale,
            color: brand.textMuted,
            marginTop: 4 * scale,
          }}
        >
          {sublabel}
        </span>
      </div>
    </div>
  );
};
