import React, {useMemo} from "react";
import {spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CAPTION_STYLES} from "./captionStyles";
import {FONTS, useTheme} from "./theme";
import type {Captions as CaptionSpec, Word} from "./types";

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Group words into on-screen chunks: max N words, break on pauses and sentence ends. */
export const chunk = (words: Word[], max: number) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && (cur.length >= max || (prev && w.s - prev.e > 0.35) || /[.!?।]$/.test(prev?.w ?? ""))) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) out.push(cur);
  return out;
};

export const Captions: React.FC<{spec: CaptionSpec; hidden: boolean}> = ({spec, hidden}) => {
  const pal = useTheme();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const st = CAPTION_STYLES[spec.style ?? "pop"] ?? CAPTION_STYLES.pop;
  const words = spec.words ?? [];
  const groups = useMemo(() => chunk(words, spec.maxWords ?? st.maxWords), [words, spec.maxWords, st.maxWords]);
  const hi = useMemo(() => new Set((spec.highlight ?? []).map(norm)), [spec.highlight]);
  if (hidden || (spec.hide ?? []).some(([a, b]) => t >= a && t < b)) return null;

  const gi = groups.findIndex((g, i) => t >= g[0].s - 0.05 && t < (groups[i + 1]?.[0].s ?? g[g.length - 1].e + 0.6) && t < g[g.length - 1].e + 0.6);
  if (gi < 0) return null;
  const g = groups[gi];
  const ai = g.reduce((acc, w, i) => (t >= w.s - 0.03 ? i : acc), -1);
  const c = (k: string) => ((pal as any)[k] as string) ?? k;
  const font = st.font === "display" ? pal.display : st.font === "body" ? pal.body : (FONTS as any)[st.font] ?? pal.display;
  const glow = st.glow?.replace(/\b(accent2|accent|fg|bg)\b/g, (m) => c(m));
  const size = spec.size ?? st.size;
  const enter = st.pop ? spring({frame: frame - Math.round(g[0].s * fps), fps, config: {stiffness: 260, damping: 18}}) : 1;
  const upper = spec.uppercase ?? st.upper;

  if (st.mode === "lyric") {
    // two lines: line one in colour, line two in the active colour from its first sung word; soft fade + 6px rise
    const half = Math.ceil(g.length / 2);
    const g0 = g[0].s, gEnd = g[g.length - 1].e;
    const op = Math.min(1, Math.max(0, (t - g0 + 0.05) / 0.4), Math.max(0, (gEnd + 0.5 - t) / 0.3));
    const line = (ws: Word[], color: string, start: number) => (
      <div style={{color, opacity: t >= start - 0.05 ? 1 : 0, textShadow: glow}}>{ws.map((w) => w.w).join(" ")}</div>
    );
    return (
      <div style={{position: "absolute", left: 120, right: 120, top: `${(spec.position ?? 0.62) * 100}%`, textAlign: "center", fontFamily: font,
        fontWeight: st.weight, fontSize: size, lineHeight: 1.3, opacity: op, transform: `translateY(calc(-50% + ${(1 - Math.min(1, (t - g0) / 0.4)) * 6}px))`}}>
        {line(g.slice(0, half), c(st.color), g0)}
        {g.length > half && line(g.slice(half), c(st.active), g[half].s)}
      </div>
    );
  }
  const shown = st.mode === "one" ? (ai >= 0 ? [g[ai]] : []) : st.mode === "typewriter" ? g.slice(0, ai + 1) : g;
  return (
    <div style={{position: "absolute", left: 70, right: 70, top: `${(spec.position ?? 0.72) * 100}%`, transform: `translateY(-50%) scale(${0.85 + 0.15 * enter})`,
      textAlign: "center", fontFamily: font, fontWeight: st.weight, fontSize: size, lineHeight: 1.18, fontStyle: st.italic ? "italic" : "normal"}}>
      {shown.map((w, i) => {
        const idx = st.mode === "one" ? ai : i;
        const active = idx === ai;
        const spoken = idx <= ai;
        const isHi = hi.has(norm(w.w));
        let color = c(st.color);
        if (st.mode === "karaoke") color = spoken ? c(st.active) : c(st.color);
        else if (active || isHi) color = isHi ? pal.accent : c(st.active);
        const boxed = (st.mode === "box" && active) || st.mode === "typewriter";
        const wp = st.pop && active ? spring({frame: frame - Math.round(w.s * fps), fps, config: {stiffness: 400, damping: 15}}) : 1;
        return (
          <span key={`${gi}-${i}`} style={{display: "inline-block", margin: "0 0.2em", padding: boxed ? "0 0.18em" : 0, borderRadius: 12,
            background: boxed ? c(st.activeBg ?? "accent") : "transparent", color: boxed && st.mode === "box" ? c(st.active) : color,
            WebkitTextStroke: st.stroke && !boxed ? `${st.stroke}px ${st.color === "transparent" ? (active ? c(st.active) : "#fff") : "#000"}` : 0,
            paintOrder: "stroke fill", textShadow: glow ?? (st.stroke ? "0 6px 18px rgba(0,0,0,.35)" : "none"),
            transform: `scale(${active && st.pop ? 1 + 0.12 * wp : 1})`, textTransform: upper ? "uppercase" : "none"}}>{w.w}</span>
        );
      })}
    </div>
  );
};
