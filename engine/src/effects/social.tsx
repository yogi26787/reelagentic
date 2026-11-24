import React from "react";
import {AbsoluteFill, Img, interpolate} from "remotion";
import {At, FX, clamp, ease, pop, rand, src, useFX, useTheme} from "../kit";

const Avatar: React.FC<{s?: string; name?: string; size: number}> = ({s, name, size}) =>
  s ? <Img src={src(s)!} style={{width: size, height: size, borderRadius: "50%", objectFit: "cover"}} />
    : <div style={{width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 800}}>{(name ?? "?").slice(0, 1).toUpperCase()}</div>;

/** Phone notification banners sliding down. p: items[{app, title, text, icon}] or app/title/text, y */
export const DMNotification: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const items: any[] = p.items ?? [{app: p.app ?? "Messages", title: p.title, text: p.text, icon: p.icon}];
  return (
    <div style={{position: "absolute", top: `${(p.y ?? 0.06) * 100}%`, left: 40, right: 40, opacity: out}}>
      {items.map((it, i) => {
        const s = pop(f, fps, i * (p.every ?? 10), 180, 16);
        return (
          <div key={i} style={{display: "flex", gap: 22, alignItems: "center", padding: "24px 28px", marginBottom: 14, borderRadius: 40,
            background: "rgba(245,245,247,0.86)", backdropFilter: "blur(30px)", boxShadow: "0 12px 40px rgba(0,0,0,.3)",
            transform: `translateY(${(1 - s) * -300}px)`, opacity: Math.min(1, s * 1.5)}}>
            {it.icon ? <Img src={src(it.icon)!} style={{width: 90, height: 90, borderRadius: 22}} />
              : <div style={{width: 90, height: 90, borderRadius: 22, background: "#34C759", color: "#fff", fontSize: 50, display: "flex", alignItems: "center", justifyContent: "center"}}>💬</div>}
            <div style={{flex: 1, fontFamily: pal.body, color: "#111"}}>
              <div style={{display: "flex", justifyContent: "space-between", fontSize: 28, color: "#666"}}><span>{(it.app ?? "").toUpperCase()}</span><span>now</span></div>
              <div style={{fontWeight: 800, fontSize: 38}}>{it.title}</div>
              <div style={{fontSize: 34, color: "#333"}}>{it.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** A comment being typed and posted, then likes ticking up. p: user, avatar, text, likes, y */
export const CommentPost: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const text = String(p.text ?? "");
  const typeEnd = Math.min(dur * 0.5, 6 + text.length * 1.2);
  const n = Math.floor(interpolate(f, [6, typeEnd], [0, text.length], clamp));
  const posted = f > typeEnd + 6;
  const likes = Math.round(interpolate(f, [typeEnd + 10, dur - 8], [0, p.likes ?? 1200], clamp));
  return (
    <At y={p.y ?? 0.7} w={940} style={{opacity: out, transform: `translate(-50%,-50%) translateY(${(1 - pop(f, fps)) * 200}px)`}}>
      <div style={{background: "#fff", borderRadius: 34, padding: "26px 30px", boxShadow: "0 18px 50px rgba(0,0,0,.35)", fontFamily: pal.body}}>
        {posted ? (
          <div style={{display: "flex", gap: 20, transform: `scale(${pop(f, fps, typeEnd + 6)})`}}>
            <Avatar s={p.avatar} name={p.user} size={80} />
            <div style={{flex: 1}}>
              <div style={{fontWeight: 800, fontSize: 32, color: "#111"}}>{p.user ?? "you"} <span style={{fontWeight: 400, color: "#888"}}>just now</span></div>
              <div style={{fontSize: 40, color: "#111", marginTop: 4}}>{text}</div>
            </div>
            <div style={{textAlign: "center", fontSize: 30, color: "#888"}}><div style={{fontSize: 44, color: likes ? "#FF3040" : "#888"}}>{likes ? "♥" : "♡"}</div>{likes.toLocaleString("en-IN")}</div>
          </div>
        ) : (
          <div style={{display: "flex", gap: 20, alignItems: "center"}}>
            <Avatar s={p.avatar} name={p.user} size={70} />
            <div style={{flex: 1, fontSize: 40, color: n ? "#111" : "#999", border: "2px solid #ddd", borderRadius: 40, padding: "14px 26px"}}>
              {n ? text.slice(0, n) : "Add a comment…"}<span style={{opacity: Math.floor(f / 8) % 2}}>|</span>
            </div>
            <div style={{fontWeight: 800, fontSize: 36, color: n === text.length ? "#0095F6" : "#B2DFFC"}}>Post</div>
          </div>
        )}
      </div>
    </At>
  );
};

/** Settings-style toggles flipping on. p: title, items[{label, on}], y */
export const IPhoneToggle: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const items: any[] = p.items ?? [];
  return (
    <At y={p.y ?? 0.3} w={860} style={{opacity: out, transform: `translate(-50%,-50%) scale(${pop(f, fps)})`}}>
      {p.title && <div style={{fontFamily: pal.body, fontWeight: 800, fontSize: 44, color: "#fff", margin: "0 0 14px 20px", textShadow: "0 2px 10px #000"}}>{p.title}</div>}
      <div style={{background: "#fff", borderRadius: 36, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,.35)"}}>
        {items.map((it, i) => {
          const on = it.on ?? true;
          const g = ease(f, 10 + i * 8, 16 + i * 8);
          const v = on ? g : 1 - g;
          return (
            <div key={i} style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px 36px", borderTop: i ? "2px solid #eee" : 0}}>
              <div style={{fontFamily: pal.body, fontSize: 44, color: "#111"}}>{it.label}</div>
              <div style={{width: 140, height: 84, borderRadius: 42, background: v > 0.5 ? "#34C759" : "#E5E5EA", position: "relative", transition: "none"}}>
                <div style={{position: "absolute", top: 6, left: 6 + v * 56, width: 72, height: 72, borderRadius: 36, background: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,.25)"}} />
              </div>
            </div>
          );
        })}
      </div>
    </At>
  );
};

/** Follow call-to-action: profile chip + button that gets tapped. p: handle, avatar, text ("Follow for more"), y */
export const FollowCTA: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const tap = Math.floor(dur * 0.55);
  const followed = f > tap;
  const press = f > tap - 3 && f < tap + 3 ? 0.88 : 1;
  return (
    <At y={p.y ?? 0.75} style={{opacity: out, transform: `translate(-50%,-50%) translateY(${(1 - pop(f, fps)) * 300}px)`}}>
      {p.text && <div style={{textAlign: "center", fontFamily: pal.display, fontWeight: 900, fontSize: 64, color: "#fff", marginBottom: 20, textShadow: "0 4px 14px rgba(0,0,0,.7)"}}>{p.text}</div>}
      <div style={{display: "flex", alignItems: "center", gap: 24, background: "#fff", borderRadius: 70, padding: "18px 20px 18px 18px", boxShadow: "0 18px 50px rgba(0,0,0,.4)"}}>
        <Avatar s={p.avatar} name={p.handle} size={100} />
        <div style={{fontFamily: pal.body, fontWeight: 800, fontSize: 44, color: "#111", paddingRight: 10}}>{p.handle ?? "@you"}</div>
        <div style={{background: followed ? "#EFEFEF" : "#0095F6", color: followed ? "#111" : "#fff", fontFamily: pal.body, fontWeight: 800, fontSize: 40,
          padding: "18px 40px", borderRadius: 40, transform: `scale(${press})`}}>{followed ? "Following ✓" : "Follow"}</div>
      </div>
    </At>
  );
};

/** Hearts floating up (likes burst). p: count, x, color */
export const LikeBurst: FX = ({p, dur}) => {
  const {f, width, height} = useFX(dur);
  const n = p.count ?? 24;
  return (
    <AbsoluteFill>
      {Array.from({length: n}).map((_, i) => {
        const st = rand(i) * dur * 0.5;
        const life = interpolate(f, [st, st + 40], [0, 1], clamp);
        if (life <= 0 || life >= 1) return null;
        const x = (p.x ?? 0.82) * width + Math.sin(life * 6 + i) * 60;
        const y = height * 0.85 - life * height * 0.5;
        return <div key={i} style={{position: "absolute", left: x, top: y, fontSize: 60 + rand(i + 9) * 50, opacity: 1 - life, color: p.color ?? "#FF3040"}}>♥</div>;
      })}
    </AbsoluteFill>
  );
};
