// Cutout effects (green-screen style). All need the person cut-out: run vision.py matte first.
import React from "react";
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig} from "remotion";
import {FX, col, ease, src, useFX, useStage, useTheme} from "../kit";

const IMG = /\.(png|jpe?g|webp|gif|svg)$/i;

/** The person, cut out, as an <OffthreadVideo> in sync with the reel (delay = frames behind). */
const Person: React.FC<{at: number; delay?: number; style?: React.CSSProperties}> = ({at, delay = 0, style}) => {
  const {foreground, cam} = useStage();
  const {fps} = useVideoConfig();
  if (!foreground) return null;
  return (
    <AbsoluteFill style={{...cam, ...style}}>
      <OffthreadVideo src={staticFile(foreground)} transparent muted trimBefore={Math.max(0, Math.round(at * fps) - delay)} />
    </AbsoluteFill>
  );
};

/** Green screen: replace the background behind you (use layer "behind"). p: src (image/video), color, gradient [c1, c2], blur */
export const BackgroundSwap: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, out} = useFX(dur);
  const fade = ease(f, 0, 6) * out;
  const fill: React.CSSProperties = {opacity: fade, filter: p.blur ? `blur(${p.blur}px)` : undefined};
  if (p.src && IMG.test(p.src))
    return <AbsoluteFill style={fill}><Img src={src(p.src)!} style={{width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.05 + 0.05 * (f / dur)})`}} /></AbsoluteFill>;
  if (p.src) return <AbsoluteFill style={fill}><OffthreadVideo src={src(p.src)!} muted style={{width: "100%", height: "100%", objectFit: "cover"}} /></AbsoluteFill>;
  const [a, b] = p.gradient ?? [col(pal, p.color, "accent"), col(pal, "accent2")];
  return <AbsoluteFill style={{...fill, background: `linear-gradient(160deg, ${a}, ${b})`}} />;
};

/** Colour pop: the world goes black-and-white, you stay in colour (use layer "behind"). p: amount (0-1) */
export const ColorPop: FX = ({p, dur, at}) => {
  const {video, cam} = useStage();
  const {fps} = useVideoConfig();
  const {f, out} = useFX(dur);
  const k = ease(f, 0, 8) * out * (p.amount ?? 1);
  return (
    <AbsoluteFill style={{...cam, filter: `grayscale(${k}) contrast(${1 + 0.15 * k})`}}>
      <OffthreadVideo src={staticFile(video)} muted trimBefore={Math.round(at * fps)} />
    </AbsoluteFill>
  );
};

/** Cutout sticker: white (or colour) outline around you, optional pop-out scale and dimmed background. p: color, width, glow, pop, dim */
export const PersonOutline: FX = ({p, dur, at}) => {
  const pal = useTheme();
  const {f, out} = useFX(dur);
  const k = ease(f, 0, 6) * out;
  const c = col(pal, p.color, "#FFFFFF");
  const w = (p.width ?? 6) * k;
  const outline = [0, 90, 180, 270].map((a) => `drop-shadow(${(Math.cos((a * Math.PI) / 180) * w).toFixed(1)}px ${(Math.sin((a * Math.PI) / 180) * w).toFixed(1)}px 0 ${c})`).join(" ");
  const glow = p.glow ? ` drop-shadow(0 0 ${24 * k}px ${col(pal, p.glow, "accent")})` : "";
  return (
    <AbsoluteFill>
      {p.dim !== 0 && <AbsoluteFill style={{background: `rgba(0,0,0,${(p.dim ?? 0.45) * k})`}} />}
      <Person at={at} style={{filter: outline + glow, transform: `${useStage().cam.transform ?? ""} scale(${1 + (p.pop ?? 0.06) * k})`}} />
    </AbsoluteFill>
  );
};

/** Echo trail: delayed copies of you fan out behind you (use layer "behind"). p: copies, delay (frames), tint, spread (px) */
export const PersonEcho: FX = ({p, dur, at}) => {
  const pal = useTheme();
  const {f, out} = useFX(dur);
  const n = p.copies ?? 3;
  const k = ease(f, 0, 6) * out;
  const tint = col(pal, p.tint, "accent2");
  return (
    <AbsoluteFill>
      {Array.from({length: n}).map((_, i) => (
        <Person key={i} at={at} delay={(i + 1) * (p.delay ?? 4)}
          style={{opacity: k * (0.55 - i * (0.4 / n)), filter: `saturate(0.35) drop-shadow(0 0 14px ${tint})`,
            translate: `${(i + 1) * (p.spread ?? 0) * (i % 2 ? -1 : 1)}px 0`}} />
      ))}
    </AbsoluteFill>
  );
};
