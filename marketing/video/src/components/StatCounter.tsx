import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { brand, fontFamilyHeading, fontFamilyBody } from "../theme";

/**
 * Animated count-up metric. NOTE: numbers are illustrative placeholders —
 * replace with your own verified results before publishing any ad.
 */
export const StatCounter: React.FC<{
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
  scale: number;
  delay: number;
}> = ({ to, prefix = "", suffix = "", label, scale, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 90, mass: 0.8 },
  });
  const value = Math.round(interpolate(enter, [0, 1], [0, to]));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 30 * scale}px)`,
      }}
    >
      <span
        style={{
          fontFamily: fontFamilyHeading,
          fontWeight: 900,
          fontSize: 130 * scale,
          lineHeight: 1,
          background: `linear-gradient(135deg, ${brand.accentLight}, ${brand.accentGlow})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: -3 * scale,
        }}
      >
        {prefix}
        {value}
        {suffix}
      </span>
      <span
        style={{
          fontFamily: fontFamilyBody,
          fontWeight: 600,
          fontSize: 28 * scale,
          color: brand.textSoft,
          marginTop: 8 * scale,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
};
