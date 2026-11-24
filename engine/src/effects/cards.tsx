import React from "react";
import {AbsoluteFill, Img, interpolate} from "remotion";
import {At, FX, card, clamp, col, ease, glass, pop, rand, src, useFX, useTheme} from "../kit";

const Logo: React.FC<{s?: string; size: number; label?: string; bg?: string}> = ({s, size, label, bg}) =>
  s ? <Img src={src(s)!} style={{width: size, height: size, borderRadius: size * 0.22, objectFit: "cover", background: "#fff"}} />
    : <div style={{width: size, height: size, borderRadius: size * 0.22, background: bg ?? "#222", color: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.5, fontWeight: 800}}>{(label ?? "?").slice(0, 1)}</div>;

/** App / tool card. p: name, logo, tagline, badge ("FREE"), y, x */
export const AppCard: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps);
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.25} style={{opacity: out}}>
      <div style={{...glass(pal, p.dark ?? false), display: "flex", alignItems: "center", gap: 30, padding: "30px 44px 30px 30px",
        transform: `translateY(${(1 - s) * 80}px) scale(${0.8 + 0.2 * s})`, minWidth: 620}}>
        <Logo s={p.logo} size={140} label={p.name} />
        <div>
          <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 64, color: p.dark ? "#fff" : "#111", display: "flex", alignItems: "center", gap: 16}}>
            {p.name}{p.badge && <span style={{fontSize: 30, background: pal.accent, color: "#111", padding: "4px 14px", borderRadius: 12}}>{p.badge}</span>}
          </div>
          {p.tagline && <div style={{fontFamily: pal.body, fontSize: 36, color: p.dark ? "#ddd" : "#555", marginTop: 6, opacity: ease(f, 6, 16)}}>{p.tagline}</div>}
        </div>
      </div>
    </At>
  );
};

/** Browser window with URL bar and an optional screenshot. p: url, image, title, y, scroll (0..1 of image to scroll) */
export const WebsiteCard: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps, 0, 140, 16);
  const scroll = interpolate(f, [10, dur - 10], [0, p.scroll ?? 0], clamp);
  return (
    <At y={p.y ?? 0.32} w={900} style={{opacity: out}}>
      <div style={{...card({...pal, bg: "#fff", fg: "#111"}), overflow: "hidden", transform: `perspective(1600px) rotateX(${(1 - s) * 30}deg) scale(${0.7 + 0.3 * s})`}}>
        <div style={{display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", background: "#F1F3F5"}}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{width: 20, height: 20, borderRadius: 10, background: c}} />)}
          <div style={{flex: 1, marginLeft: 14, background: "#fff", borderRadius: 14, padding: "10px 20px", fontFamily: pal.body, fontSize: 30, color: "#333"}}>🔒 {p.url}</div>
        </div>
        <div style={{height: p.height ?? 560, overflow: "hidden", background: "#fff"}}>
          {p.image ? <Img src={src(p.image)!} style={{width: "100%", transform: `translateY(${-scroll * 100}%)`}} />
            : <div style={{padding: 40, fontFamily: pal.display, fontWeight: 800, fontSize: 64, color: "#111"}}>{p.title ?? p.url}
                {[0, 1, 2, 3].map((i) => <div key={i} style={{height: 26, borderRadius: 13, background: "#E5E7EB", marginTop: 28, width: `${90 - i * 15}%`}} />)}</div>}
        </div>
      </div>
    </At>
  );
};

/** Search bar that types a query, then shows results. p: query, results[] , engine label, y */
export const SearchBar: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const q = String(p.query ?? "");
  const typed = Math.floor(interpolate(f, [6, 6 + q.length * 1.6], [0, q.length], clamp));
  const done = 10 + q.length * 1.6;
  const results: string[] = p.results ?? [];
  return (
    <At y={p.y ?? 0.27} w={900} style={{opacity: out, transform: `translate(-50%,-50%) scale(${pop(f, fps)})`}}>
      <div style={{background: "#fff", borderRadius: 60, padding: "28px 40px", display: "flex", alignItems: "center", gap: 22, boxShadow: "0 18px 50px rgba(0,0,0,.35)"}}>
        <span style={{fontSize: 46}}>🔍</span>
        <span style={{fontFamily: pal.body, fontSize: 46, color: "#222"}}>{q.slice(0, typed)}<span style={{opacity: Math.floor(f / 8) % 2, color: "#4285F4"}}>|</span></span>
      </div>
      {results.map((r, i) => {
        const s = pop(f, fps, done + i * 4);
        return (
          <div key={i} style={{background: "#fff", borderRadius: 24, padding: "22px 34px", marginTop: 16, fontFamily: pal.body, fontSize: 36, color: "#1a0dab",
            opacity: s, transform: `translateY(${(1 - s) * 30}px)`, boxShadow: "0 10px 30px rgba(0,0,0,.25)"}}>{r}</div>
        );
      })}
    </At>
  );
};

/** Chat-style prompt box typing a prompt, then a send tap. p: text, label ("Ask anything"), y, logo */
export const PromptTyping: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const text = String(p.text ?? "");
  const end = Math.min(dur - 16, 8 + text.length * (p.speed ?? 1.2));
  const n = Math.floor(interpolate(f, [8, end], [0, text.length], clamp));
  const sent = f > end + 4;
  return (
    <At y={p.y ?? 0.3} w={920} style={{opacity: out, transform: `translate(-50%,-50%) translateY(${(1 - pop(f, fps)) * 60}px)`}}>
      <div style={{...glass(pal, true), padding: 34, borderRadius: 40}}>
        {p.logo && <div style={{marginBottom: 18}}><Img src={src(p.logo)!} style={{height: 56, borderRadius: 12}} /></div>}
        <div style={{fontFamily: pal.body, fontSize: 44, color: n ? "#fff" : "#999", minHeight: 120, lineHeight: 1.35}}>
          {n ? text.slice(0, n) : p.label ?? "Ask anything"}<span style={{opacity: sent ? 0 : Math.floor(f / 8) % 2}}>▍</span>
        </div>
        <div style={{display: "flex", justifyContent: "flex-end"}}>
          <div style={{width: 84, height: 84, borderRadius: 42, background: sent ? pal.accent : "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, transform: `scale(${sent ? 1 - 0.15 * Math.max(0, 1 - (f - end - 4) / 6) : 1})`}}>↑</div>
        </div>
      </div>
    </At>
  );
};

/** Mouse cursor that glides to a point and clicks (ripple). p: from [x,y], to [x,y], label, clickAt (s) */
export const CursorClick: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out, width, height} = useFX(dur);
  const [x0, y0] = p.from ?? [0.8, 0.8];
  const [x1, y1] = p.to ?? [0.5, 0.45];
  const clickF = (p.clickAt ?? 0.6) * fps;
  const m = ease(f, 0, clickF - 2);
  const x = (x0 + (x1 - x0) * m) * width, y = (y0 + (y1 - y0) * m) * height;
  const r = interpolate(f, [clickF, clickF + 14], [0, 1], clamp);
  const press = f >= clickF && f < clickF + 4 ? 0.85 : 1;
  return (
    <AbsoluteFill style={{opacity: out}}>
      {p.label && <At x={x1} y={y1} style={{transform: `translate(-50%,-50%) scale(${f >= clickF ? pop(f, fps, clickF) : 0})`}}>
        <div style={{background: pal.accent, color: "#111", fontFamily: pal.display, fontWeight: 800, fontSize: 50, padding: "18px 36px", borderRadius: 50}}>{p.label}</div>
      </At>}
      {r > 0 && r < 1 && <div style={{position: "absolute", left: x - 70 * r, top: y - 70 * r, width: 140 * r, height: 140 * r, borderRadius: "50%",
        border: `6px solid ${pal.accent}`, opacity: 1 - r}} />}
      <svg width={70} height={70} viewBox="0 0 24 24" style={{position: "absolute", left: x - 8, top: y - 4, transform: `scale(${press})`, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.4))"}}>
        <path d="M4 2l16 9-7 1.6L9.8 20z" fill="#fff" stroke="#000" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

/** Polaroid photo dropping in with a caption. p: image, caption, x, y, rotate */
export const Polaroid: FX = ({p, dur}) => {
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps, 0, 120, 13);
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.32} style={{opacity: out}}>
      <div style={{background: "#fafafa", padding: "26px 26px 90px", boxShadow: "0 30px 60px rgba(0,0,0,.45)", width: p.w ?? 560,
        transform: `rotate(${(p.rotate ?? -6) * s + (1 - s) * 25}deg) translateY(${(1 - s) * -900}px)`}}>
        {p.image ? <Img src={src(p.image)!} style={{width: "100%", aspectRatio: "1", objectFit: "cover"}} /> : <div style={{width: "100%", aspectRatio: "1", background: "#ccc"}} />}
        <div style={{fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 64, color: "#222", textAlign: "center", marginTop: 18}}>{p.caption}</div>
      </div>
    </At>
  );
};

/** Stack of cards dropping in one by one. p: items[{title, text, icon}], y */
export const CardDrop: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const items: any[] = p.items ?? [];
  const per = Math.max(6, Math.floor((dur - 20) / Math.max(1, items.length)));
  return (
    <At y={p.y ?? 0.3} w={880} style={{opacity: out}}>
      {items.map((it, i) => {
        const s = pop(f, fps, i * per, 150, 14);
        return (
          <div key={i} style={{...card(pal), display: "flex", gap: 24, alignItems: "center", padding: "26px 34px", marginTop: i ? 18 : 0,
            transform: `translateY(${(1 - s) * -400}px) rotate(${(1 - s) * (i % 2 ? 8 : -8)}deg)`, opacity: Math.min(1, s * 2)}}>
            {it.icon && <div style={{fontSize: 64}}>{it.icon}</div>}
            <div>
              <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 52}}>{it.title}</div>
              {it.text && <div style={{fontFamily: pal.body, fontSize: 34, color: pal.muted}}>{it.text}</div>}
            </div>
          </div>
        );
      })}
    </At>
  );
};

/** Any image (screenshot, product, meme) popping in. p: image, x, y, w, rotate, frame ("phone"|"card"|"none") */
export const ImageCard: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const s = pop(f, fps);
  const phone = p.frame === "phone";
  return (
    <At x={p.x ?? 0.5} y={p.y ?? 0.32} w={p.w ?? (phone ? 520 : 820)} style={{opacity: out}}>
      <div style={{transform: `scale(${0.6 + 0.4 * s}) rotate(${(p.rotate ?? 0) + (1 - s) * 6}deg)`, borderRadius: phone ? 70 : pal.radius, overflow: "hidden",
        border: phone ? "18px solid #111" : p.frame === "none" ? 0 : "8px solid #fff", boxShadow: "0 30px 70px rgba(0,0,0,.45)"}}>
        {p.image && <Img src={src(p.image)!} style={{width: "100%", display: "block"}} />}
      </div>
      {p.caption && <div style={{textAlign: "center", marginTop: 18, fontFamily: pal.display, fontWeight: 800, fontSize: 48, color: "#fff",
        textShadow: "0 3px 12px rgba(0,0,0,.7)"}}>{p.caption}</div>}
    </At>
  );
};

/** Grid of logos popping in (tools list). p: logos[{logo, name}], y, cols */
export const LogoGrid: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const items: any[] = p.logos ?? [];
  const cols = p.cols ?? 3;
  return (
    <At y={p.y ?? 0.3} w={900} style={{opacity: out, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 30}}>
      {items.map((it, i) => {
        const s = pop(f, fps, i * 3 + rand(i) * 4);
        return (
          <div key={i} style={{...glass(pal, false), padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: `scale(${s})`}}>
            <Logo s={it.logo} size={130} label={it.name} />
            <div style={{fontFamily: pal.body, fontWeight: 700, fontSize: 30, color: "#111"}}>{it.name}</div>
          </div>
        );
      })}
    </At>
  );
};

