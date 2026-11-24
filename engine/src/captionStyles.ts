// Caption styles. mode decides grouping/animation; colours fall back to the look's palette.
// "accent" / "fg" / "bg" are palette references.
export type CaptionStyle = {
  mode: "group" | "karaoke" | "box" | "one" | "typewriter" | "lyric";
  font: string; // FONTS key or "display" / "body"
  size: number;
  weight: number;
  upper?: boolean;
  color: string;
  active: string;
  activeBg?: string;
  stroke?: number;
  glow?: string;
  maxWords: number;
  pop?: boolean;
  italic?: boolean;
};

export const CAPTION_STYLES: Record<string, CaptionStyle> = {
  pop: {mode: "group", font: "display", size: 78, weight: 900, upper: false, color: "#FFFFFF", active: "accent", stroke: 10, maxWords: 3, pop: true},
  karaoke: {mode: "karaoke", font: "display", size: 66, weight: 800, color: "rgba(255,255,255,0.55)", active: "#FFFFFF", stroke: 8, maxWords: 5},
  box: {mode: "box", font: "display", size: 70, weight: 800, color: "#FFFFFF", active: "fg", activeBg: "accent", stroke: 8, maxWords: 3},
  "bold-caps": {mode: "group", font: "anton", size: 104, weight: 400, upper: true, color: "#FFFFFF", active: "accent", stroke: 12, maxWords: 2, pop: true},
  minimal: {mode: "group", font: "inter", size: 54, weight: 600, color: "#FFFFFF", active: "#FFFFFF", maxWords: 6, glow: "0 2px 14px rgba(0,0,0,.55)"},
  neon: {mode: "group", font: "montserrat", size: 74, weight: 900, upper: true, color: "#FFFFFF", active: "accent2", glow: "0 0 18px accent2, 0 0 42px accent2", maxWords: 3, pop: true},
  typewriter: {mode: "typewriter", font: "mono", size: 58, weight: 700, color: "#FFFFFF", active: "#FFFFFF", activeBg: "rgba(0,0,0,0.72)", maxWords: 6},
  outline: {mode: "group", font: "bebas", size: 112, weight: 400, upper: true, color: "transparent", active: "accent", stroke: 3, maxWords: 2, pop: true},
  "highlight-bar": {mode: "box", font: "poppins", size: 62, weight: 800, color: "#FFFFFF", glow: "0 3px 14px rgba(0,0,0,.6)", active: "fg", activeBg: "accent", maxWords: 4},
  comic: {mode: "group", font: "bangers", size: 96, weight: 400, upper: true, color: "#FFFFFF", active: "accent", stroke: 12, maxWords: 2, pop: true},
  "serif-classic": {mode: "karaoke", font: "dmSerif", size: 70, weight: 400, color: "rgba(255,255,255,0.6)", active: "#FFFFFF", glow: "0 2px 16px rgba(0,0,0,.6)", maxWords: 4, italic: true},
  "one-word": {mode: "one", font: "montserrat", size: 120, weight: 900, upper: true, color: "#FFFFFF", active: "#FFFFFF", stroke: 12, maxWords: 1, pop: true},
  lyric: {mode: "lyric", font: "tiro", size: 56, weight: 400, color: "#F2EADB", active: "#E2A93B", glow: "0 2px 12px rgba(0,0,0,.45)", maxWords: 6},
  hindi: {mode: "group", font: "baloo", size: 80, weight: 800, color: "#FFFFFF", active: "accent", stroke: 10, maxWords: 3, pop: true},
};
