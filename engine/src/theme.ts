import {createContext, useContext} from "react";
import {F} from "./fonts";

export type Palette = {
  bg: string; // card / panel background
  fg: string; // main text
  accent: string;
  accent2: string;
  muted: string;
  display: string; // headline font
  body: string; // body font
  grade: string; // CSS filter applied to the footage
  radius: number;
};

// Looks: palette + fonts + footage grade. A brand.json palette overrides any field.
export const LOOKS: Record<string, Palette> = {
  clean: {bg: "#FFFFFF", fg: "#111111", accent: "#FFD400", accent2: "#2D6BFF", muted: "#6B7280", display: F.poppins, body: F.poppins, grade: "contrast(1.05) saturate(1.05)", radius: 28},
  "creator-yellow": {bg: "#111111", fg: "#FFFFFF", accent: "#FFE500", accent2: "#FF3D71", muted: "#A1A1AA", display: F.montserrat, body: F.poppins, grade: "contrast(1.08) saturate(1.1)", radius: 26},
  "tech-blue": {bg: "#0B1020", fg: "#F5F7FF", accent: "#3B82F6", accent2: "#22D3EE", muted: "#94A3B8", display: F.grotesk, body: F.inter, grade: "contrast(1.06) saturate(0.95) hue-rotate(-4deg)", radius: 24},
  "neon-night": {bg: "#0A0014", fg: "#FFFFFF", accent: "#B026FF", accent2: "#00F0FF", muted: "#9CA3AF", display: F.montserrat, body: F.inter, grade: "contrast(1.12) saturate(1.2) brightness(0.95)", radius: 22},
  "finance-green": {bg: "#06140D", fg: "#ECFDF5", accent: "#22C55E", accent2: "#FACC15", muted: "#86EFAC", display: F.grotesk, body: F.inter, grade: "contrast(1.05) saturate(0.95)", radius: 22},
  "warm-film": {bg: "#1C1410", fg: "#FFF4E6", accent: "#F59E0B", accent2: "#EF4444", muted: "#D6C7B2", display: F.dmSerif, body: F.poppins, grade: "sepia(0.18) contrast(1.06) saturate(1.05)", radius: 18},
  "bold-red": {bg: "#FFFFFF", fg: "#0A0A0A", accent: "#FF2D2D", accent2: "#111111", muted: "#525252", display: F.anton, body: F.poppins, grade: "contrast(1.1) saturate(1.05)", radius: 14},
  "pastel-pop": {bg: "#FFF7FB", fg: "#2B1B3D", accent: "#FF7AC6", accent2: "#7AD3FF", muted: "#8B7A99", display: F.baloo, body: F.baloo, grade: "brightness(1.04) saturate(1.1)", radius: 34},
  "mono-luxe": {bg: "#0D0D0D", fg: "#F5F5F5", accent: "#D4AF37", accent2: "#FFFFFF", muted: "#8A8A8A", display: F.dmSerif, body: F.inter, grade: "grayscale(0.25) contrast(1.1)", radius: 10},
  "comic": {bg: "#FFF8DC", fg: "#111111", accent: "#FF4D00", accent2: "#0066FF", muted: "#444444", display: F.bangers, body: F.poppins, grade: "contrast(1.12) saturate(1.25)", radius: 8},
  "desi-festive": {bg: "#2A0E0A", fg: "#FFF3D6", accent: "#FFB800", accent2: "#E8461C", muted: "#E8C99B", display: F.baloo, body: F.baloo, grade: "sepia(0.1) saturate(1.15) contrast(1.04)", radius: 24},
  "matrix": {bg: "#020A04", fg: "#C8FFD4", accent: "#00FF66", accent2: "#00C2FF", muted: "#4ADE80", display: F.mono, body: F.mono, grade: "contrast(1.1) saturate(0.85) hue-rotate(8deg)", radius: 6},
  "news": {bg: "#FFFFFF", fg: "#0B1B33", accent: "#E11D2E", accent2: "#0B3D91", muted: "#4B5563", display: F.bebas, body: F.inter, grade: "contrast(1.04)", radius: 4},
  "natural": {bg: "#FAFAF7", fg: "#1F2937", accent: "#10B981", accent2: "#F97316", muted: "#6B7280", display: F.poppins, body: F.inter, grade: "none", radius: 24},
};

export const FONTS = F;

export const makePalette = (look = "clean", over: Record<string, any> = {}): Palette => {
  const base = LOOKS[look] ?? LOOKS.clean;
  const p: any = {...base};
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined || v === "") continue;
    // brand.json may name a font key ("anton") instead of a family
    p[k] = (k === "display" || k === "body") && (F as any)[v] ? (F as any)[v] : v;
  }
  return p;
};

export const Theme = createContext<Palette>(LOOKS.clean);
export const useTheme = () => useContext(Theme);
