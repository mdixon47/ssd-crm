import { Scene } from "../components/Scene";
import { KineticText } from "../components/KineticText";
import { brand, fontFamilyBody } from "../theme";

export type HookContent = {
  kicker: string;
  headline: string;
  kickerColor?: string;
};

/** Default hook (pain angle) — overridable for A/B variant packs. */
export const DEFAULT_HOOK: HookContent = {
  kicker: "Paid Ads, Honestly",
  headline: "Burning budget on clicks that never convert?",
  kickerColor: brand.ig,
};

/** Problem hook — names the prospect's pain in the first 3 seconds. */
export const Hook: React.FC<{
  durationInFrames: number;
  content?: Partial<HookContent>;
}> = ({ durationInFrames, content }) => {
  // Merge per-field so a partial override (e.g. from Studio props) can never
  // blank out the headline; only the provided fields replace the defaults.
  const merged: HookContent = { ...DEFAULT_HOOK, ...content };
  return (
  <Scene durationInFrames={durationInFrames}>
    {(scale) => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 * scale }}>
        <span
          style={{
            fontFamily: fontFamilyBody,
            fontWeight: 700,
            fontSize: 26 * scale,
            letterSpacing: 4 * scale,
            textTransform: "uppercase",
            color: merged.kickerColor ?? brand.ig,
            opacity: 0.9,
          }}
        >
          {merged.kicker}
        </span>
        <KineticText text={merged.headline} size={86} scale={scale} color={brand.white} />
      </div>
    )}
  </Scene>
  );
};
