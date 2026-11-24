import React from "react";
import {AbsoluteFill, interpolate} from "remotion";
import {At, FX, clamp, col, ease, pop, rand, richWords, useFX, useTheme} from "../kit";

/** Big hook title, word-by-word pop. p: text ("*accent* words"), y, size, sub, bg ("none"|"card"|"band") */
export const HookTitle: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const words = richWords(p.text);
  const size = p.size ?? 96;
  const band = p.bg === "band" || p.bg === "card";
  return (
    <At y={p.y ?? 0.2} w="88%" style={{textAlign: "center", opacity: out}}>
      <div style={{display: "inline-block", padding: band ? "28px 40px" : 0, background: band ? pal.bg : "none", borderRadius: pal.radius,
        transform: `scale(${band ? pop(f, fps) : 1})`, boxShadow: band ? "0 20px 50px rgba(0,0,0,.35)" : "none"}}>
        <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: -1, textTransform: p.upper ? "uppercase" : "none"}}>
          {words.map((w, i) => {
            const s = pop(f, fps, i * (p.stagger ?? 3));
            return (
              <span key={i} style={{display: "inline-block", margin: "0 0.12em", transform: `translateY(${(1 - s) * 40}px) scale(${0.6 + 0.4 * s})`, opacity: s,
                color: w.hi ? pal.accent : band ? pal.fg : "#fff", WebkitTextStroke: band ? 0 : "10px rgba(0,0,0,0.85)", paintOrder: "stroke fill"}}>{w.w}</span>
            );
          })}
        </div>
        {p.sub && <div style={{fontFamily: pal.body, fontWeight: 600, fontSize: size * 0.38, marginTop: 14, color: band ? pal.muted : "#fff", opacity: ease(f, 8, 18),
          textShadow: band ? "none" : "0 3px 12px rgba(0,0,0,.7)"}}>{p.sub}</div>}
      </div>
    </At>
  );
};

/** Giant word(s) meant for layer "behind" (text behind you). p: text, y, size, color, outline */
export const TextBehind: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps, 0, 120, 16);
  const lines = String(p.text ?? "").split("\n");
  const size = p.size ?? 300;
  return (
    <At y={p.y ?? 0.3} w="100%" style={{textAlign: "center", opacity: out}}>
      {lines.map((l, i) => (
        <div key={i} style={{fontFamily: p.font ? (p.font in pal ? (pal as any)[p.font] : p.font) : pal.display, fontWeight: 900, fontSize: size, lineHeight: 0.9,
          letterSpacing: -4, textTransform: "uppercase", color: p.outline ? "transparent" : col(pal, p.color, "#FFFFFF"),
          WebkitTextStroke: p.outline ? `6px ${col(pal, p.color, "#FFFFFF")}` : 0,
          transform: `translateY(${(1 - s) * 120}px) scale(${0.85 + 0.15 * s})`, textShadow: p.outline ? "none" : "0 10px 40px rgba(0,0,0,.25)"}}>{l}</div>
      ))}
    </At>
  );
};

/** Headline whose two halves slide in from opposite sides. p: top, bottom, y */
export const SplitHeadline: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out, width} = useFX(dur);
  const a = pop(f, fps, 0), b = pop(f, fps, 5);
  const st: React.CSSProperties = {fontFamily: pal.display, fontWeight: 900, fontSize: p.size ?? 120, lineHeight: 1, textTransform: "uppercase", whiteSpace: "nowrap"};
  return (
    <At y={p.y ?? 0.22} w="100%" style={{textAlign: "center", opacity: out}}>
      <div style={{...st, color: "#fff", transform: `translateX(${(1 - a) * -width}px)`, textShadow: "0 6px 24px rgba(0,0,0,.5)"}}>{p.top}</div>
      <div style={{...st, display: "inline-block", padding: "6px 24px", background: pal.accent, color: pal.bg === "#FFFFFF" ? "#111" : pal.bg,
        transform: `translateX(${(1 - b) * width}px) rotate(-2deg)`}}>{p.bottom}</div>
    </At>
  );
};

/** "Lights-out" LED sign: letters switch on one by one, flicker, then go dark. p: text, y, color */
export const LEDSign: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f} = useFX(dur);
  const text = String(p.text ?? "");
  const c = col(pal, p.color, "accent");
  return (
    <At y={p.y ?? 0.2} w="92%" style={{textAlign: "center"}}>
      <div style={{display: "inline-block", padding: "26px 36px", background: "rgba(5,5,8,0.82)", borderRadius: 24, border: "4px solid #222"}}>
        {text.split("").map((ch, i) => {
          const on = f > i * 2 && f < dur - 10 - (text.length - i) && !(rand(i * 7 + Math.floor(f / 3)) > 0.93 && f < 30);
          return (
            <span key={i} style={{fontFamily: "monospace", fontWeight: 900, fontSize: p.size ?? 110, color: on ? c : "#1a1a1a",
              textShadow: on ? `0 0 12px ${c}, 0 0 36px ${c}, 0 0 70px ${c}` : "none", whiteSpace: "pre"}}>{ch}</span>
          );
        })}
      </div>
    </At>
  );
};

/** Rubber stamp slam. p: text, x, y, color, rotate */
export const Stamp: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps, 0, 260, 18);
  const c = col(pal, p.color, "#E11D2E");
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.4} style={{opacity: out * Math.min(1, s * 1.4)}}>
      <div style={{transform: `rotate(${p.rotate ?? -12}deg) scale(${2.4 - 1.4 * s})`, border: `10px solid ${c}`, borderRadius: 18, padding: "10px 34px",
        color: c, fontFamily: pal.display, fontWeight: 900, fontSize: p.size ?? 110, textTransform: "uppercase", letterSpacing: 4,
        background: "rgba(255,255,255,0.08)", mixBlendMode: "normal", whiteSpace: "nowrap"}}>{p.text ?? "APPROVED"}</div>
    </At>
  );
};

/** Strip of masking tape with handwritten label. p: text, x, y, rotate */
export const TapeLabel: FX = ({p, dur}) => {
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps);
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.3} style={{opacity: out}}>
      <div style={{transform: `rotate(${p.rotate ?? -4}deg) scaleX(${s})`, transformOrigin: "left center", background: p.color ?? "rgba(250,236,180,0.95)",
        padding: "18px 44px", fontFamily: "'Caveat', 'Marker Felt', cursive", fontWeight: 700, fontSize: p.size ?? 84, color: "#222",
        clipPath: "polygon(2% 0,98% 4%,100% 50%,97% 100%,3% 96%,0 50%)", boxShadow: "0 8px 18px rgba(0,0,0,.25)", whiteSpace: "nowrap"}}>{p.text}</div>
    </At>
  );
};

/** Name + title bar. p: name, title, y, side ("left"|"right") */
export const LowerThird: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const a = pop(f, fps), b = pop(f, fps, 5);
  const right = p.side === "right";
  return (
    <div style={{position: "absolute", top: `${(p.y ?? 0.66) * 100}%`, [right ? "right" : "left"]: 60, opacity: out, textAlign: right ? "right" : "left"}}>
      <div style={{display: "inline-block", background: pal.accent, color: "#111", fontFamily: pal.display, fontWeight: 900, fontSize: 62, padding: "10px 26px",
        clipPath: `inset(0 ${(1 - a) * 100}% 0 0)`}}>{p.name}</div><br />
      <div style={{display: "inline-block", background: pal.bg, color: pal.fg, fontFamily: pal.body, fontWeight: 600, fontSize: 38, padding: "8px 26px",
        clipPath: `inset(0 ${(1 - b) * 100}% 0 0)`}}>{p.title}</div>
    </div>
  );
};

/** Arrow + label pointing at something. p: text, x, y (label), tx, ty (target), color */
export const Callout: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out, width, height} = useFX(dur);
  const draw = ease(f, 0, 14);
  const c = col(pal, p.color, "accent");
  const x1 = (p.x ?? 0.3) * width, y1 = (p.y ?? 0.3) * height, x2 = (p.tx ?? 0.6) * width, y2 = (p.ty ?? 0.5) * height;
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25, my = (y1 + y2) / 2 - (x2 - x1) * 0.25;
  const len = Math.hypot(x2 - x1, y2 - y1) * 1.3;
  const ang = Math.atan2(y2 - my, x2 - mx);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <svg width={width} height={height} style={{position: "absolute"}}>
        <path d={`M${x1},${y1 + 40} Q${mx},${my} ${x2},${y2}`} stroke={c} strokeWidth={10} fill="none" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        {draw > 0.95 && <path d={`M${x2},${y2} l${-40 * Math.cos(ang - 0.5)},${-40 * Math.sin(ang - 0.5)} M${x2},${y2} l${-40 * Math.cos(ang + 0.5)},${-40 * Math.sin(ang + 0.5)}`}
          stroke={c} strokeWidth={10} strokeLinecap="round" />}
      </svg>
      <At x={p.x ?? 0.3} y={p.y ?? 0.3} style={{transform: `translate(-50%,-50%) scale(${pop(f, fps)})`}}>
        <div style={{background: c, color: "#111", fontFamily: pal.display, fontWeight: 800, fontSize: 50, padding: "10px 24px", borderRadius: 16, whiteSpace: "nowrap"}}>{p.text}</div>
      </At>
    </AbsoluteFill>
  );
};

/** Words that slam in one per beat, centre screen. p: words[] , y, size */
export const WordSlam: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const words: string[] = p.words ?? String(p.text ?? "").split(/\s+/);
  const per = Math.max(4, Math.floor(dur / Math.max(1, words.length)));
  const i = Math.min(words.length - 1, Math.floor(f / per));
  const s = pop(f, fps, i * per, 300, 16);
  return (
    <At y={p.y ?? 0.45} w="96%" style={{textAlign: "center", opacity: out}}>
      <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: p.size ?? 170, color: i % 2 ? pal.accent : "#fff", textTransform: "uppercase",
        transform: `scale(${1.6 - 0.6 * s})`, WebkitTextStroke: "12px #000", paintOrder: "stroke fill", lineHeight: 1}}>{words[i]}</div>
    </At>
  );
};

/** Typed subtitle/quote with blinking caret. p: text, y, size */
export const TypeOn: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, out} = useFX(dur);
  const text = String(p.text ?? "");
  const n = Math.floor(interpolate(f, [0, Math.min(dur - 10, text.length * (p.speed ?? 1.5))], [0, text.length], clamp));
  return (
    <At y={p.y ?? 0.25} w="86%" style={{textAlign: "center", opacity: out}}>
      <span style={{fontFamily: pal.body, fontWeight: 800, fontSize: p.size ?? 72, color: "#fff", background: "rgba(0,0,0,.7)", padding: "6px 18px",
        boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", lineHeight: 1.45}}>
        {text.slice(0, n)}<span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: pal.accent}}>▍</span>
      </span>
    </At>
  );
};
