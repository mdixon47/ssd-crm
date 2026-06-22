import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { brand, fontFamilyHeading } from "../theme";

type Props = {
  text: string;
  /** font size in px at 1080 short-edge; auto-scales to other formats via `scale` */
  size: number;
  scale: number;
  color?: string;
  weight?: number;
  delay?: number;
  align?: "left" | "center";
  lineHeight?: number;
  maxWidth?: number | string;
};

/**
 * Word-by-word spring reveal. Each word springs up + fades in, staggered.
 */
export const KineticText: React.FC<Props> = ({
  text,
  size,
  scale,
  color = brand.white,
  weight = 800,
  delay = 0,
  align = "center",
  lineHeight = 1.05,
  maxWidth = "90%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `${0.12 * size * scale}px ${0.28 * size * scale}px`,
        maxWidth,
        textAlign: align,
      }}
    >
      {words.map((word, i) => {
        const start = delay + i * 3;
        const enter = spring({
          frame: frame - start,
          fps,
          config: { damping: 200, stiffness: 120, mass: 0.6 },
        });
        const y = interpolate(enter, [0, 1], [0.35 * size * scale, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: fontFamilyHeading,
              fontSize: size * scale,
              fontWeight: weight,
              lineHeight,
              letterSpacing: -0.5 * scale,
              color,
              opacity: enter,
              transform: `translateY(${y}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
