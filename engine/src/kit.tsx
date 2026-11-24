// Shared building blocks for effects (built-in and custom). Custom effects import from "../kit".
import React, {createContext, useContext} from "react";
import {interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Palette, useTheme} from "./theme";
import type {Face} from "./types";

export {useTheme};
export type {Palette};

/** The footage, the person cut-out and the current camera transform, for effects that work on the video itself. */
export type StageInfo = {video: string; foreground?: string; cam: React.CSSProperties; beats?: number[]};
export const Stage = createContext<StageInfo>({video: "", cam: {}});
export const useStage = () => useContext(Stage);

/** Easing curves for motion design (input/output 0..1). */
export const easings = {
  linear: (x: number) => x,
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
  outElastic: (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** Music beats (reel seconds) that fall inside this moment, as frames relative to its start. */
export const useMomentBeats = (at: number, dur: number, fps: number) =>
  (useStage().beats ?? []).map((b) => Math.round((b - at) * fps)).filter((f) => f >= 0 && f < dur);

/** 1 on a beat, decaying to 0 over `len` frames: drive pulses and pops from the music. */
export const beatPulse = (f: number, beatFrames: number[], len = 8) => {
  const last = beatFrames.filter((b) => b <= f).pop();
  return last === undefined ? 0 : Math.max(0, 1 - (f - last) / len);
};

/** Every effect receives its moment props `p`, its length in frames `dur`, and faces (if analysed). */
export type FXProps = {p: Record<string, any>; dur: number; faces?: Face[]; at: number};
export type FX = React.FC<FXProps>;

export const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const useFX = (dur: number) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  return {f, fps, width, height, out, t: f / fps};
};

/** Spring 0→1 starting `delay` frames into the moment. */
export const pop = (f: number, fps: number, delay = 0, stiff = 170, damping = 14) =>
  spring({frame: f - delay, fps, config: {stiffness: stiff, damping}});

export const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});

/** Resolve "accent" / "fg" / ... to palette colours; pass through real colours. */
export const col = (pal: Palette, c?: string, fallback = "fg") => {
  const k = c ?? fallback;
  return (pal as any)[k] ?? k;
};

/** Asset path from a storyboard (render.py rewrites "studio:x" to "studio/x"); URLs pass through. */
export const src = (s?: string) => (!s ? undefined : /^(https?:|data:)/.test(s) ? s : staticFile(s));

export const glass = (pal: Palette, dark = true): React.CSSProperties => ({
  background: dark ? "rgba(12,12,16,0.55)" : "rgba(255,255,255,0.72)",
  backdropFilter: "blur(22px) saturate(1.4)",
  WebkitBackdropFilter: "blur(22px) saturate(1.4)",
  border: `1.5px solid ${dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.9)"}`,
  borderRadius: pal.radius,
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
});

export const card = (pal: Palette): React.CSSProperties => ({
  background: pal.bg,
  color: pal.fg,
  borderRadius: pal.radius,
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
});

/** Absolutely positioned box centred at (x,y) in 0..1 of the frame. */
export const At: React.FC<{x?: number; y?: number; w?: number | string; style?: React.CSSProperties; children: React.ReactNode}> = ({x = 0.5, y = 0.5, w, style, children}) => (
  <div style={{position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translate(-50%,-50%)", width: w, ...style}}>{children}</div>
);

/** Nearest analysed face to time t (seconds, output timeline). */
export const faceAt = (faces: Face[] | undefined, t: number) =>
  faces && faces.length ? faces.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)) : undefined;

export const inr = (n: number, decimals = 0) =>
  n.toLocaleString("en-IN", {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

export const fmtMoney = (n: number, currency = "₹", decimals = 0) =>
  currency === "₹" ? `₹${inr(n, decimals)}` : `${currency}${n.toLocaleString("en-US", {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}`;

/** "Save *₹50,000* a year" → words, with *starred* words marked as accent. */
export const richWords = (text: string) =>
  String(text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({w: w.replace(/\*/g, ""), hi: /\*/.test(w)}));

/** Deterministic pseudo-random (renders must be frame-stable). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
