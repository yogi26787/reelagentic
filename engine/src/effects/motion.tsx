import React from "react";
import {AbsoluteFill, Img, interpolate} from "remotion";
import {At, FX, clamp, col, ease, faceAt, glass, pop, rand, src, useFX, useTheme} from "../kit";

/** Confetti burst from the bottom corners. p: count, colors[] */
export const Confetti: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, width, height} = useFX(dur);
  const colors: string[] = p.colors ?? [pal.accent, pal.accent2, "#FF4D8D", "#22C55E", "#FFFFFF"];
  const n = p.count ?? 120;
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      {Array.from({length: n}).map((_, i) => {
        const left = i % 2 === 0;
        const vx = (left ? 1 : -1) * (8 + rand(i) * 22), vy = -(38 + rand(i + 1) * 30);
        const t = f;
        const x = (left ? 0 : width) + vx * t;
        const y = height + vy * t + 0.9 * t * t;
        const r = t * (10 + rand(i + 2) * 20);
        return <div key={i} style={{position: "absolute", left: x, top: y, width: 18, height: 30, background: colors[i % colors.length],
          transform: `rotate(${r}deg) rotateX(${r * 2}deg)`, borderRadius: 3, opacity: interpolate(f, [dur - 10, dur], [1, 0], clamp)}} />;
      })}
    </AbsoluteFill>
  );
};

/** Emoji burst from a point. p: emoji ("🔥" or list), x, y, count */
export const EmojiBurst: FX = ({p, dur}) => {
  const {f, width, height} = useFX(dur);
  const list: string[] = Array.isArray(p.emoji) ? p.emoji : [p.emoji ?? "🔥"];
  const n = p.count ?? 18;
  const cx = (p.x ?? 0.5) * width, cy = (p.y ?? 0.5) * height;
  return (
    <AbsoluteFill>
      {Array.from({length: n}).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + rand(i);
        const d = ease(f, 0, 20) * (220 + rand(i + 3) * 260);
        const o = interpolate(f, [dur - 12, dur], [1, 0], clamp);
        return <div key={i} style={{position: "absolute", left: cx + Math.cos(a) * d - 40, top: cy + Math.sin(a) * d - 40 + f * 1.5, fontSize: 70 + rand(i + 5) * 50,
          opacity: o, transform: `scale(${pop(f, 30, 0)}) rotate(${(rand(i) - 0.5) * 60}deg)`}}>{list[i % list.length]}</div>;
      })}
    </AbsoluteFill>
  );
};

/** Flip-clock countdown. p: from (3), label, y */
export const FlipCountdown: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const from = p.from ?? 3;
  const per = dur / (from + (p.label ? 1 : 0));
  const i = Math.min(Math.floor(f / per), from);
  const local = f - i * per;
  const flip = interpolate(local, [0, 8], [-90, 0], clamp);
  const txt = i < from ? String(from - i) : p.label;
  return (
    <At y={p.y ?? 0.35} style={{opacity: out, perspective: 1400}}>
      <div style={{background: "#141414", color: i < from ? "#fff" : pal.accent, fontFamily: pal.display, fontWeight: 900, fontSize: i < from ? 300 : 120,
        minWidth: 380, padding: "20px 50px", textAlign: "center", borderRadius: 40, transform: `rotateX(${flip}deg) scale(${pop(f, fps, i * per)})`,
        boxShadow: "0 30px 60px rgba(0,0,0,.5)", backgroundImage: "linear-gradient(180deg,#222 50%,#111 50%)"}}>{txt}</div>
    </At>
  );
};

/** Keyboard keys raining down, letters spell a word. p: word, count */
export const KeyRain: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, width, height, out} = useFX(dur);
  const keys = String(p.word ?? "AI TOOLS").replace(/\s/g, "").split("");
  const n = p.count ?? 26;
  return (
    <AbsoluteFill style={{opacity: out}}>
      {Array.from({length: n}).map((_, i) => {
        const x = rand(i) * (width - 160);
        const st = rand(i + 7) * dur * 0.5;
        const y = interpolate(f, [st, st + 40], [-200, height + 100], clamp);
        const k = keys[i % keys.length] ?? "A";
        return <div key={i} style={{position: "absolute", left: x, top: y, width: 140, height: 140, borderRadius: 26, background: "#F4F4F5",
          boxShadow: "0 10px 0 #A1A1AA, 0 18px 30px rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: pal.display, fontWeight: 800, fontSize: 70, color: "#111", transform: `rotate(${(rand(i + 3) - 0.5) * 50 + f}deg)`}}>{k}</div>;
      })}
    </AbsoluteFill>
  );
};

/** Neon rectangles rushing toward camera (room tunnel). p: color, speed */
export const RoomTunnel: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, out} = useFX(dur);
  const c = col(pal, p.color, "accent2");
  return (
    <AbsoluteFill style={{opacity: out * 0.9, mixBlendMode: "screen", perspective: 900}}>
      {Array.from({length: 10}).map((_, i) => {
        const z = ((i / 10 + (f * (p.speed ?? 0.012))) % 1);
        const s = 0.1 + z * z * 2.4;
        return <div key={i} style={{position: "absolute", left: "50%", top: "45%", width: 1080, height: 1920, marginLeft: -540, marginTop: -960,
          border: `${6 + z * 10}px solid ${c}`, borderRadius: 30, transform: `scale(${s})`, opacity: z < 0.9 ? z : (1 - z) * 9, boxShadow: `0 0 40px ${c}, inset 0 0 40px ${c}`}} />;
      })}
    </AbsoluteFill>
  );
};

const project = (lat: number, lon: number, lon0: number, R: number) => {
  const toR = Math.PI / 180;
  const x = R * Math.cos(lat * toR) * Math.sin((lon - lon0) * toR);
  const y = -R * Math.sin(lat * toR);
  const vis = Math.cos(lat * toR) * Math.cos((lon - lon0) * toR) > 0;
  return {x, y, vis};
};

/** Wireframe globe spinning to a flight arc between two places. p: from {name, lat, lon}, to {name, lat, lon}, y */
export const GlobeFlight: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const A = p.from ?? {name: "Delhi", lat: 28.6, lon: 77.2};
  const B = p.to ?? {name: "Dubai", lat: 25.2, lon: 55.3};
  const R = 340;
  const lon0 = interpolate(f, [0, dur * 0.4], [A.lon + 80, (A.lon + B.lon) / 2], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const g = ease(f, dur * 0.35, dur * 0.8);
  const arc: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps * g; i++) {
    const t = i / steps;
    const lat = A.lat + (B.lat - A.lat) * t, lon = A.lon + (B.lon - A.lon) * t;
    const q = project(lat, lon, lon0, R * (1 + 0.12 * Math.sin(Math.PI * t)));
    arc.push(`${i ? "L" : "M"}${q.x + R + 40},${q.y + R + 40}`);
  }
  const lines: React.ReactNode[] = [];
  for (let lo = -180; lo < 180; lo += 20) {
    const pts: string[] = [];
    for (let la = -90; la <= 90; la += 6) {const q = project(la, lo, lon0, R); if (q.vis) pts.push(`${q.x + R + 40},${q.y + R + 40}`);}
    if (pts.length > 1) lines.push(<polyline key={`o${lo}`} points={pts.join(" ")} stroke="rgba(255,255,255,.25)" fill="none" strokeWidth={2} />);
  }
  for (let la = -60; la <= 60; la += 20) {
    const pts: string[] = [];
    for (let lo = -180; lo <= 180; lo += 5) {const q = project(la, lo, lon0, R); if (q.vis) pts.push(`${q.x + R + 40},${q.y + R + 40}`);}
    if (pts.length > 1) lines.push(<polyline key={`a${la}`} points={pts.join(" ")} stroke="rgba(255,255,255,.25)" fill="none" strokeWidth={2} />);
  }
  const pin = (P: any, show: number) => {
    const q = project(P.lat, P.lon, lon0, R);
    return q.vis && show > 0 ? (
      <g transform={`translate(${q.x + R + 40},${q.y + R + 40}) scale(${show})`}>
        <circle r={14} fill={pal.accent} stroke="#fff" strokeWidth={4} />
        <text y={-28} textAnchor="middle" fill="#fff" fontSize={40} fontWeight={800} fontFamily={pal.body}>{P.name}</text>
      </g>
    ) : null;
  };
  return (
    <At y={p.y ?? 0.3} style={{opacity: out, transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * pop(f, fps)})`}}>
      <svg width={2 * R + 80} height={2 * R + 80}>
        <circle cx={R + 40} cy={R + 40} r={R} fill="rgba(20,40,90,.55)" stroke="rgba(255,255,255,.5)" strokeWidth={3} />
        {lines}
        <path d={arc.join(" ")} stroke={pal.accent} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray="2 16" />
        {pin(A, ease(f, dur * 0.3, dur * 0.4))}
        {pin(B, ease(f, dur * 0.75, dur * 0.85))}
      </svg>
    </At>
  );
};

/** Map card with pins dropping. p: pins[{name, x, y}] (0..1 within card), title, image (map screenshot), y */
export const MapPin: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const pins: any[] = p.pins ?? [{name: p.name ?? "Here", x: 0.5, y: 0.5}];
  return (
    <At y={p.y ?? 0.3} w={900} style={{opacity: out, transform: `translate(-50%,-50%) scale(${pop(f, fps)})`}}>
      <div style={{position: "relative", height: 620, borderRadius: pal.radius, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.4)",
        background: p.image ? "#ddd" : "repeating-linear-gradient(35deg,#E8EEF3 0 60px,#DDE6EE 60px 62px), #E8EEF3"}}>
        {p.image && <Img src={src(p.image)!} style={{width: "100%", height: "100%", objectFit: "cover"}} />}
        {!p.image && <svg width="100%" height="100%" style={{position: "absolute"}}><path d="M0,400 C200,350 300,500 500,420 S800,300 900,360" stroke="#fff" strokeWidth={26} fill="none" /><path d="M300,0 C320,200 280,400 340,620" stroke="#fff" strokeWidth={18} fill="none" /></svg>}
        {p.title && <div style={{position: "absolute", top: 24, left: 24, background: "#fff", padding: "12px 24px", borderRadius: 16, fontFamily: pal.display, fontWeight: 800, fontSize: 40}}>{p.title}</div>}
        {pins.map((pin, i) => {
          const s = pop(f, fps, 8 + i * 8, 200, 12);
          return (
            <div key={i} style={{position: "absolute", left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, transform: `translate(-50%,-100%) translateY(${(1 - s) * -300}px)`, textAlign: "center"}}>
              <div style={{background: "#fff", padding: "6px 16px", borderRadius: 12, fontFamily: pal.body, fontWeight: 800, fontSize: 30, marginBottom: 6, opacity: s}}>{pin.name}</div>
              <svg width={70} height={90} viewBox="0 0 24 30"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 30 12 30s12-10 12-18.3C24 5.2 18.6 0 12 0z" fill="#EA4335" /><circle cx={12} cy={11.5} r={4.5} fill="#fff" /></svg>
            </div>
          );
        })}
      </div>
    </At>
  );
};

/** Location tag chip. p: place, sub, x, y */
export const LocationTag: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps);
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.12} style={{opacity: out}}>
      <div style={{...glass(pal, true), display: "flex", alignItems: "center", gap: 16, padding: "18px 34px", borderRadius: 60, transform: `scale(${s})`}}>
        <span style={{fontSize: 52}}>📍</span>
        <div>
          <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 48, color: "#fff", clipPath: `inset(0 ${(1 - ease(f, 4, 16)) * 100}% 0 0)`}}>{p.place}</div>
          {p.sub && <div style={{fontFamily: pal.body, fontSize: 30, color: "#ddd"}}>{p.sub}</div>}
        </div>
      </div>
    </At>
  );
};

/** Corner brackets locking onto the face with a label. p: label, color */
export const FaceLock: FX = ({p, dur, faces, at}) => {
  const pal = useTheme();
  const {f, fps, out, width, height, t} = useFX(dur);
  const face = faceAt(faces, at + t) ?? {x: 0.35, y: 0.2, w: 0.3, h: 0.2, t: 0};
  const s = 1.6 - 0.6 * pop(f, fps, 0, 200, 16);
  const pad = 0.04;
  const x = (face.x - pad) * width, y = (face.y - pad) * height, w = (face.w + 2 * pad) * width, h = (face.h + 2 * pad) * height;
  const c = col(pal, p.color, "accent");
  const L = 70, T = 10;
  const corner = (cx: number, cy: number, dx: number, dy: number, k: number) => (
    <g key={k}><rect x={dx > 0 ? cx : cx - L} y={cy - T / 2} width={L} height={T} fill={c} /><rect x={cx - T / 2} y={dy > 0 ? cy : cy - L} width={T} height={L} fill={c} /></g>
  );
  return (
    <AbsoluteFill style={{opacity: out}}>
      <svg width={width} height={height}>
        <g transform={`translate(${x + w / 2},${y + h / 2}) scale(${s}) translate(${-(x + w / 2)},${-(y + h / 2)})`}>
          {corner(x, y, 1, 1, 0)}{corner(x + w, y, -1, 1, 1)}{corner(x, y + h, 1, -1, 2)}{corner(x + w, y + h, -1, -1, 3)}
        </g>
      </svg>
      {p.label && <div style={{position: "absolute", left: x, top: y + h + 20, background: c, color: "#111", fontFamily: "monospace", fontWeight: 800,
        fontSize: 34, padding: "6px 16px", opacity: ease(f, 8, 14)}}>{p.label}</div>}
    </AbsoluteFill>
  );
};

/** Reel thumbnails orbiting the head. p: images[], count, radius */
export const ReelsOrbit: FX = ({p, dur, faces, at}) => {
  const pal = useTheme();
  const {f, out, width, height, t} = useFX(dur);
  const face = faceAt(faces, at + t) ?? {x: 0.4, y: 0.2, w: 0.2, h: 0.15, t: 0};
  const cx = (face.x + face.w / 2) * width, cy = (face.y + face.h / 2) * height;
  const imgs: string[] = p.images ?? [];
  const n = p.count ?? Math.max(6, imgs.length);
  const R = (p.radius ?? 0.36) * width;
  return (
    <AbsoluteFill style={{opacity: out * ease(f, 0, 10)}}>
      {Array.from({length: n}).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + f * 0.035;
        const z = Math.sin(a);
        const x = cx + Math.cos(a) * R, y = cy + z * R * 0.22;
        if (z < 0 && p.behindHead !== false) return null; // back half hidden so it reads as orbiting (pair with layer "behind" for true depth)
        return (
          <div key={i} style={{position: "absolute", left: x - 70, top: y - 120, width: 140, height: 240, borderRadius: 18, overflow: "hidden",
            transform: `scale(${0.75 + 0.25 * (z + 1) / 2})`, boxShadow: "0 10px 30px rgba(0,0,0,.4)", border: "3px solid #fff",
            background: `linear-gradient(160deg, ${pal.accent}, ${pal.accent2})`}}>
            {imgs[i % Math.max(1, imgs.length)] && <Img src={src(imgs[i % imgs.length])!} style={{width: "100%", height: "100%", objectFit: "cover"}} />}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Dim everything except a circle around the face (or a point). p: x, y, r, dim */
export const Spotlight: FX = ({p, dur, faces, at}) => {
  const {f, out, t} = useFX(dur);
  const face = faceAt(faces, at + t);
  const x = p.x ?? (face ? face.x + face.w / 2 : 0.5), y = p.y ?? (face ? face.y + face.h / 2 : 0.35);
  const r = (p.r ?? 0.28) * 100;
  return <AbsoluteFill style={{opacity: out * ease(f, 0, 8), background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, transparent ${r * 0.8}%, rgba(0,0,0,${p.dim ?? 0.75}) ${r}%)`}} />;
};
