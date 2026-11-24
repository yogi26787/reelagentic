// Effects inspired by editing styles in the wider Claude-video ecosystem (telestrator, step decks,
// beat-locked kinetic type) plus a generic transparent-clip overlay (HyperFrames, Manim, motion skills).
import React from "react";
import {AbsoluteFill, Freeze, OffthreadVideo, interpolate, staticFile, useVideoConfig} from "remotion";
import {At, FX, beatPulse, clamp, col, ease, easings, pop, richWords, src, useFX, useMomentBeats, useStage, useTheme} from "../kit";

/** Telestrator: freeze the frame and draw on it like a sports replay. p: marks[{type:"circle",x,y,r}|{type:"arrow",from:[x,y],to:[x,y]}|{type:"underline",x,y,w}], label, color */
export const Telestrator: FX = ({p, dur, at}) => {
  const pal = useTheme();
  const {video, cam} = useStage();
  const {fps, width, height} = useVideoConfig();
  const {f, out} = useFX(dur);
  const c = col(pal, p.color, "#FFE600");
  const marks: any[] = p.marks ?? [{type: "circle", x: 0.5, y: 0.4, r: 0.12}];
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill style={cam}>
        <Freeze frame={0}><OffthreadVideo src={staticFile(video)} muted trimBefore={Math.round(at * fps)} /></Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{background: "rgba(0,0,0,0.18)"}} />
      <svg width={width} height={height} style={{position: "absolute"}}>
        {marks.map((m, i) => {
          const g = ease(f, 4 + i * 8, 16 + i * 8);
          if (m.type === "arrow") {
            const [x1, y1] = m.from, [x2, y2] = m.to;
            const L = Math.hypot((x2 - x1) * width, (y2 - y1) * height);
            const a = Math.atan2((y2 - y1) * height, (x2 - x1) * width);
            return (
              <g key={i} stroke={c} strokeWidth={12} strokeLinecap="round" fill="none">
                <line x1={x1 * width} y1={y1 * height} x2={x2 * width} y2={y2 * height} strokeDasharray={L} strokeDashoffset={L * (1 - g)} />
                {g > 0.95 && <path d={`M${x2 * width},${y2 * height} l${-50 * Math.cos(a - 0.5)},${-50 * Math.sin(a - 0.5)} M${x2 * width},${y2 * height} l${-50 * Math.cos(a + 0.5)},${-50 * Math.sin(a + 0.5)}`} />}
              </g>
            );
          }
          if (m.type === "underline")
            return <path key={i} d={`M${m.x * width},${m.y * height} q${(m.w ?? 0.3) * width * 0.5},18 ${(m.w ?? 0.3) * width},0`} stroke={c} strokeWidth={12}
              fill="none" strokeLinecap="round" strokeDasharray={2000} strokeDashoffset={2000 * (1 - g)} />;
          const r = (m.r ?? 0.1) * width;
          return <ellipse key={i} cx={m.x * width} cy={m.y * height} rx={r} ry={r * 0.9} stroke={c} strokeWidth={12} fill="none"
            strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - g)} transform={`rotate(-8 ${m.x * width} ${m.y * height})`} />;
        })}
      </svg>
      {p.label && <At y={p.y ?? 0.12}><div style={{background: c, color: "#111", fontFamily: pal.display, fontWeight: 900, fontSize: 56, padding: "8px 26px",
        transform: `rotate(-2deg) scale(${pop(f, 30)})`, whiteSpace: "nowrap"}}>{p.label}</div></At>}
    </AbsoluteFill>
  );
};

/** Step deck: giant italic numeral with a word card, for numbered tips. p: n, title, sub, x, y */
export const StepNumber: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const k = easings.outExpo(Math.min(1, f / 14));
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.24} style={{opacity: out, display: "flex", alignItems: "center", gap: 10}}>
      <div style={{fontFamily: pal.display, fontWeight: 900, fontStyle: "italic", fontSize: 340, lineHeight: 0.8, color: pal.accent,
        WebkitTextStroke: "8px #000", paintOrder: "stroke fill", transform: `translateX(${(1 - k) * -300}px) skewX(-6deg)`}}>{p.n ?? 1}</div>
      <div style={{background: pal.bg, color: pal.fg, borderRadius: pal.radius, padding: "22px 30px", minWidth: 460, maxWidth: 640,
        transform: `translateY(${(1 - pop(f, fps, 6)) * 60}px)`, opacity: Math.min(1, pop(f, fps, 6) * 1.5), boxShadow: "0 18px 40px rgba(0,0,0,.35)"}}>
        <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 64, lineHeight: 1.05}}>{p.title}</div>
        {p.sub && <div style={{fontFamily: pal.body, fontSize: 36, color: pal.muted, marginTop: 6}}>{p.sub}</div>}
      </div>
    </At>
  );
};

/** Kinetic typography locked to the music: one word per beat (or every `every` frames), masked reveal, accent on *word*. p: text, y, size, every */
export const KineticType: FX = ({p, dur, at}) => {
  const pal = useTheme();
  const {fps} = useVideoConfig();
  const {f, out} = useFX(dur);
  const words = richWords(p.text);
  const beats = useMomentBeats(at, dur, fps);
  const starts = words.map((_, i) => (beats.length >= words.length ? beats[i] : i * (p.every ?? 6)));
  const pulse = beatPulse(f, beats, 6);
  return (
    <At y={p.y ?? 0.3} w="92%" style={{opacity: out, textAlign: "center", transform: `translate(-50%,-50%) scale(${1 + 0.04 * pulse})`}}>
      {words.map((w, i) => {
        const g = easings.outExpo(interpolate(f, [starts[i], starts[i] + 8], [0, 1], clamp));
        const big = i % 3 === 0;
        return (
          <span key={i} style={{display: "inline-block", overflow: "hidden", verticalAlign: "bottom", margin: `0 ${(p.size ?? 110) * 0.14}px`}}>
            <span style={{display: "inline-block", fontFamily: pal.display, fontWeight: 900, fontSize: (p.size ?? 110) * (big ? 1.15 : 0.85),
              lineHeight: 1.05, textTransform: "uppercase", color: w.hi ? pal.accent : "#fff", transform: `translateY(${(1 - g) * 110}%)`,
              WebkitTextStroke: "6px rgba(0,0,0,.85)", paintOrder: "stroke fill"}}>{w.w}</span>
          </span>
        );
      })}
    </At>
  );
};

/** Any transparent clip (WebM/MOV with alpha, e.g. rendered by HyperFrames, Manim or a motion skill) placed on the reel. p: src, x, y, w, fit("contain"|"full") */
export const OverlayClip: FX = ({p, dur}) => {
  const {out, f, width} = useFX(dur);
  const full = p.fit === "full";
  const style: React.CSSProperties = full ? {width: "100%", height: "100%"} : {width: "100%"};
  const clip = p.src ? <OffthreadVideo src={src(p.src)!} transparent muted={p.muted ?? true} style={style} /> : null;
  if (full) return <AbsoluteFill style={{opacity: out * ease(f, 0, 4)}}>{clip}</AbsoluteFill>;
  return <At x={p.x ?? 0.5} y={p.y ?? 0.35} w={(p.w ?? 0.8) * width} style={{opacity: out * ease(f, 0, 4)}}>{clip}</At>;
};
