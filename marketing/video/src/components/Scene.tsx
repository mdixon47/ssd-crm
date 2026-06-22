import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleFor } from "../theme";

/**
 * Centered, padded scene container with automatic fade-in / fade-out.
 * Children receive the computed `scale` via a render-prop for format-agnostic sizing.
 */
export const Scene: React.FC<{
  durationInFrames: number;
  children: (scale: number) => React.ReactNode;
  fade?: number;
}> = ({ durationInFrames, children, fade = 12 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = scaleFor(width, height);

  // Clamp the fade so the interpolate input range stays strictly increasing
  // even for very short scenes (durationInFrames <= 2*fade would otherwise
  // produce a non-monotonic range and make interpolate() throw).
  const f = Math.max(1, Math.min(fade, Math.floor(durationInFrames / 2) - 1));
  const opacity = interpolate(
    frame,
    [0, f, durationInFrames - f, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: "center",
        alignItems: "center",
        padding: `${0.08 * Math.min(width, height)}px ${0.07 * width}px`,
      }}
    >
      {children(scale)}
    </AbsoluteFill>
  );
};
