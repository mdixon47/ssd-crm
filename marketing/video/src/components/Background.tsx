import { useId } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { brand } from "../theme";

/**
 * Animated brand backdrop: deep navy radial wash, slow-drifting accent glow,
 * and a subtle perspective grid. Pure CSS/SVG so it renders fast and offline.
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  // Unique per-instance id so multiple Backgrounds never collide on the SVG def.
  const gridId = `grid-${useId()}`;

  const drift = interpolate(frame, [0, durationInFrames], [0, 1]);
  const glowX = interpolate(drift, [0, 1], [width * 0.25, width * 0.7]);
  const glowY = interpolate(drift, [0, 1], [height * 0.35, height * 0.2]);

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bgDeep, overflow: "hidden" }}>
      {/* base vertical gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(160deg, ${brand.bg} 0%, ${brand.bgDeep} 55%, #04060f 100%)`,
        }}
      />
      {/* drifting accent glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${glowX}px ${glowY}px, ${brand.accent}33 0%, transparent 45%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${width - glowX}px ${height - glowY}px, ${brand.ig}22 0%, transparent 50%)`,
        }}
      />
      {/* perspective grid */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.12 }}
      >
        <defs>
          <pattern id={gridId} width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke={brand.accentGlow}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill={`url(#${gridId})`} />
      </svg>
      {/* vignette */}
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 ${Math.min(width, height) * 0.5}px ${Math.min(
            width,
            height
          ) * 0.25}px rgba(0,0,0,0.55)`,
        }}
      />
    </AbsoluteFill>
  );
};
