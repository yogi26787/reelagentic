import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {richWords} from "./kit";
import {makePalette} from "./theme";
import type {Story} from "./types";

/** Reel cover: best frame + punchy title placed on the side away from the face. */
export const Cover: React.FC<Story> = (s) => {
  const pal = makePalette(s.look, s.palette);
  const c = s.cover ?? {};
  const face = c.face;
  const faceY = face ? face.y + face.h / 2 : 0.35;
  const titleTop = faceY < 0.45; // face high → title low
  const words = richWords(c.title ?? "");
  return (
    <AbsoluteFill style={{background: "#000"}}>
      {c.frame && <Img src={staticFile(c.frame)} style={{width: "100%", height: "100%", objectFit: "cover", filter: pal.grade === "none" ? undefined : pal.grade}} />}
      <AbsoluteFill style={{background: titleTop ? "linear-gradient(180deg, transparent 45%, rgba(0,0,0,.75) 85%)" : "linear-gradient(0deg, transparent 45%, rgba(0,0,0,.75) 85%)"}} />
      <div style={{position: "absolute", left: 60, right: 60, [titleTop ? "bottom" : "top"]: titleTop ? 300 : 200, textAlign: "center"}}>
        <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: words.length > 6 ? 110 : 140, lineHeight: 1.02, letterSpacing: -2, textTransform: "uppercase"}}>
          {words.map((w, i) => (
            <span key={i} style={{display: "inline-block", margin: "0 0.12em", color: w.hi ? pal.accent : "#fff", WebkitTextStroke: "12px #000", paintOrder: "stroke fill"}}>{w.w}</span>
          ))}
        </div>
        {c.subtitle && <div style={{display: "inline-block", marginTop: 26, background: pal.accent, color: "#111", fontFamily: pal.body, fontWeight: 800, fontSize: 52,
          padding: "10px 30px", borderRadius: 16}}>{c.subtitle}</div>}
      </div>
    </AbsoluteFill>
  );
};
