import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, fontFamilyHeading } from "../theme";

/**
 * SSD Consulting wordmark — monogram tile + name. Swap for an SVG/PNG
 * in src/assets later via staticFile() without changing callers.
 */
export const Logo: React.FC<{ scale: number; delay?: number }> = ({
  scale,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 140, mass: 0.5 },
  });

  const tile = 92 * scale;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24 * scale,
        opacity: enter,
        transform: `scale(${0.9 + enter * 0.1})`,
      }}
    >
      <div
        style={{
          width: tile,
          height: tile,
          borderRadius: 22 * scale,
          background: `linear-gradient(135deg, ${brand.accent}, ${brand.accentLight})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${40 * scale}px ${brand.accent}66`,
          fontFamily: fontFamilyHeading,
          fontWeight: 900,
          fontSize: 44 * scale,
          color: brand.bgDeep,
          letterSpacing: -1 * scale,
        }}
      >
        SSD
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: fontFamilyHeading,
            fontWeight: 800,
            fontSize: 40 * scale,
            color: brand.white,
            letterSpacing: -0.5 * scale,
          }}
        >
          SSD Consulting
        </span>
        <span
          style={{
            fontFamily: fontFamilyHeading,
            fontWeight: 600,
            fontSize: 21 * scale,
            color: brand.accentLight,
            letterSpacing: 3 * scale,
            textTransform: "uppercase",
            marginTop: 6 * scale,
          }}
        >
          Paid Acquisition
        </span>
      </div>
    </div>
  );
};
