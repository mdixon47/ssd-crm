import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, fontFamilyBody } from "../theme";

/**
 * The pill call-to-action button. Shared by the hero CTA scene and the 6s ad cut
 * so a brand restyle only happens in one place.
 */
export const CtaButton: React.FC<{
  label: string;
  scale: number;
  delay?: number;
}> = ({ label, scale, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 130, mass: 0.5 },
  });

  return (
    <div
      style={{
        opacity: enter,
        transform: `scale(${0.85 + enter * 0.15})`,
        padding: `${26 * scale}px ${52 * scale}px`,
        borderRadius: 999,
        background: `linear-gradient(135deg, ${brand.accent}, ${brand.accentLight})`,
        color: brand.bgDeep,
        fontFamily: fontFamilyBody,
        fontWeight: 900,
        fontSize: 40 * scale,
        boxShadow: `0 ${16 * scale}px ${50 * scale}px ${brand.accent}66`,
      }}
    >
      {label}
    </div>
  );
};
