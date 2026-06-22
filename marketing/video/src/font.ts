import { loadFont } from "@remotion/google-fonts/Inter";

/**
 * Load only the Inter weights/subset we actually use. Passing no options makes
 * @remotion/google-fonts fetch every weight × subset × style (~100+ files,
 * triggers the "too many requests" warning) and is a hard error in Remotion v5.
 * Import this module once (HeroAd / AdCut) for the side effect.
 */
export const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});
