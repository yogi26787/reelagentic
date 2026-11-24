import React from "react";
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Captions} from "./Captions";
import {custom} from "./custom";
import {effects} from "./effects";
import {clamp, faceAt, rand, src} from "./kit";
import {Theme, makePalette} from "./theme";
import type {Moment, Story} from "./types";

const ALL = {...effects, ...custom};
const IMG = /\.(png|jpe?g|webp|gif|svg)$/i;

/** Camera: zooms + transitions → transform/filter shared by footage and the person cut-out. */
const camera = (s: Story, t: number, fps: number, W: number, H: number) => {
  let scale = 1, ox = 0, oy = 0, blur = 0, extra = "";
  let focus: [number, number] = [0.5, 0.4];
  for (const z of s.zooms ?? []) {
    if (t < z.start || t >= z.end) continue;
    const face = faceAt(s.faces, t);
    focus = z.focus ?? (face ? [face.x + face.w / 2, face.y + face.h / 2] : focus);
    const target = z.scale ?? 1.25;
    const type = z.type ?? "punch";
    const k = type === "smooth"
      ? interpolate(t, [z.start, z.end], [0, 1], {...clamp, easing: (x) => x * x * (3 - 2 * x)})
      : interpolate(t, [z.start, z.start + 3 / fps], [0, 1], clamp);
    scale = 1 + (target - 1) * k;
    if (type === "shake") {
      ox += Math.sin(t * 60) * 10;
      oy += Math.cos(t * 47) * 8;
    }
  }
  for (const tr of s.transitions ?? []) {
    const d = tr.dur ?? 0.3;
    const p = (t - (tr.time - d / 2)) / d;
    if (p < 0 || p > 1) continue;
    const bell = Math.sin(Math.PI * p);
    if (tr.type === "whip") {
      ox += (p < 0.5 ? -p : 1 - p) * 2 * W * 0.1;
      scale *= 1 + bell * 0.25; // overscan so the shift never shows black edges
      blur = Math.max(blur, bell * 36);
    } else if (tr.type === "zoom-blur") {
      scale *= 1 + bell * 0.35;
      blur = Math.max(blur, bell * 18);
    } else if (tr.type === "glitch") {
      ox += (rand(Math.floor(t * fps)) - 0.5) * 80 * bell;
      extra += ` hue-rotate(${Math.round(rand(Math.floor(t * fps) + 1) * 180 * bell)}deg) saturate(${1 + bell})`;
    } else if (tr.type === "shake") {
      ox += Math.sin(t * 90) * 24 * bell;
      oy += Math.cos(t * 70) * 18 * bell;
    }
  }
  return {
    transform: `translate(${ox}px, ${oy}px) scale(${scale})`,
    transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
    blur: blur > 0.5 ? ` blur(${blur.toFixed(1)}px)` : "",
    extra,
  };
};

/** Light overlays for flash / burn / leak / glitch transitions. */
const TransitionOverlay: React.FC<{s: Story; t: number}> = ({s, t}) => (
  <>
    {(s.transitions ?? []).map((tr, i) => {
      const d = tr.dur ?? (tr.type === "burn" || tr.type === "leak" ? 0.8 : 0.3);
      const p = (t - (tr.time - d / 2)) / d;
      if (p < 0 || p > 1) return null;
      const bell = Math.sin(Math.PI * p);
      if (tr.type === "flash") return <AbsoluteFill key={i} style={{background: "#fff", opacity: bell}} />;
      if (tr.type === "burn")
        return <AbsoluteFill key={i} style={{mixBlendMode: "screen", opacity: bell,
          background: `radial-gradient(circle at ${20 + p * 60}% ${70 - p * 40}%, #fff6d0 0%, #ff8a00 22%, #b00000 45%, transparent 70%)`}} />;
      if (tr.type === "leak")
        return <AbsoluteFill key={i} style={{mixBlendMode: "screen", opacity: bell * 0.85,
          background: `linear-gradient(${110 + p * 60}deg, transparent 10%, rgba(255,120,40,.85) 40%, rgba(255,210,120,.7) 55%, transparent 80%)`}} />;
      if (tr.type === "glitch")
        return (
          <AbsoluteFill key={i} style={{mixBlendMode: "screen", opacity: bell}}>
            {Array.from({length: 7}).map((_, j) => {
              const r = rand(Math.floor(t * 30) * 13 + j);
              return <div key={j} style={{position: "absolute", left: 0, right: 0, top: `${r * 100}%`, height: 8 + r * 50,
                background: j % 2 ? "rgba(255,0,80,.6)" : "rgba(0,255,240,.6)", transform: `translateX(${(r - 0.5) * 200}px)`}} />;
            })}
          </AbsoluteFill>
        );
      return null;
    })}
  </>
);

/** Merge [start,end] windows (seconds) of behind-layer moments into frame ranges. */
const windows = (ms: Moment[], fps: number) => {
  const iv = ms.map((m) => [m.start, m.end]).sort((a, b) => a[0] - b[0]);
  const out: number[][] = [];
  for (const [a, b] of iv) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out.map(([a, b]) => ({from: Math.round(a * fps), dur: Math.max(1, Math.round((b - a) * fps))}));
};

const MomentView: React.FC<{m: Moment; s: Story; fps: number}> = ({m, s, fps}) => {
  const C = ALL[m.effect];
  const from = Math.round(m.start * fps);
  const dur = Math.max(1, Math.round((m.end - m.start) * fps));
  if (!C) return null;
  return (
    <Sequence from={from} durationInFrames={dur} name={`${m.effect} ${m.id ?? ""}`} layout="none">
      <AbsoluteFill><C p={m.props ?? {}} dur={dur} faces={s.faces} at={m.start} /></AbsoluteFill>
    </Sequence>
  );
};

export const Reel: React.FC<Story> = (s) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const pal = makePalette(s.look, s.palette);
  const cam = camera(s, t, fps, width, height);
  const camStyle: React.CSSProperties = {transform: cam.transform, transformOrigin: cam.transformOrigin, filter: `${pal.grade === "none" ? "" : pal.grade}${cam.blur}${cam.extra}` || undefined};
  const behind = s.moments.filter((m) => m.layer === "behind");
  const front = s.moments.filter((m) => m.layer !== "behind");
  const hideCaps = s.moments.some((m) => m.props?.hideCaptions && t >= m.start && t < m.end);
  const words = s.captions?.words ?? [];
  const speaking = (x: number) => words.some((w) => x >= w.s - 0.15 && x <= w.e + 0.15);

  return (
    <Theme.Provider value={pal}>
      <AbsoluteFill style={{background: "#000", overflow: "hidden"}}>
        <AbsoluteFill style={camStyle}>
          <OffthreadVideo src={staticFile(s.video)} volume={s.videoVolume ?? 1} />
        </AbsoluteFill>

        {(s.broll ?? []).map((b, i) => {
          const from = Math.round(b.start * fps), dur = Math.max(1, Math.round((b.end - b.start) * fps));
          const mode = b.mode ?? "full";
          const box: React.CSSProperties = mode === "pip" ? {left: "52%", top: "8%", width: "42%", height: "30%", borderRadius: 30, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 20px 50px rgba(0,0,0,.4)"}
            : mode === "split" ? {left: 0, top: 0, width: "100%", height: "50%", overflow: "hidden"} : {inset: 0};
          return (
            <Sequence key={i} from={from} durationInFrames={dur} layout="none">
              <div style={{position: "absolute", ...box}}>
                {IMG.test(b.src)
                  ? <Img src={src(b.src)!} style={{width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.05 + 0.1 * ((frame - from) / dur)})`}} />
                  : <OffthreadVideo src={src(b.src)!} muted={b.muted ?? true} trimBefore={Math.round((b.startFrom ?? 0) * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />}
              </div>
            </Sequence>
          );
        })}

        {behind.map((m, i) => <MomentView key={`b${i}`} m={m} s={s} fps={fps} />)}
        {s.foreground && windows(behind, fps).map((w, i) => (
          <Sequence key={`fg${i}`} from={w.from} durationInFrames={w.dur} layout="none">
            <AbsoluteFill style={camStyle}>
              <OffthreadVideo src={staticFile(s.foreground!)} transparent muted trimBefore={w.from} />
            </AbsoluteFill>
          </Sequence>
        ))}
        {front.map((m, i) => <MomentView key={`f${i}`} m={m} s={s} fps={fps} />)}

        {s.captions && <Captions spec={s.captions} hidden={hideCaps} />}
        {s.progressBar && <div style={{position: "absolute", left: 0, top: 0, height: 10, width: `${(t / s.duration) * 100}%`, background: pal.accent}} />}
        <TransitionOverlay s={s} t={t} />

        {s.music && (
          <Audio src={src(s.music.src)!} loop trimBefore={Math.round((s.music.startFrom ?? 0) * fps)}
            volume={(f) => {
              const v = s.music!.volume ?? 0.15;
              const fade = Math.min(1, f / (fps * 0.5), (s.duration * fps - f) / fps);
              return Math.max(0, (s.music!.duck !== false && speaking(f / fps) ? v * 0.55 : v) * fade);
            }} />
        )}
        {s.moments.filter((m) => m.sfx).map((m, i) => (
          <Sequence key={`sfx${i}`} from={Math.round((m.start + (m.sfxAt ?? 0)) * fps)} layout="none">
            <Audio src={src(m.sfx)!} volume={m.sfxVolume ?? 0.6} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </Theme.Provider>
  );
};
