// 3D effects rendered with three.js through @remotion/three. For custom 3D work, the
// CloudAI-X/threejs-skills skills (three r186+, React Three Fiber 9) are the reference.
import React, {useEffect, useMemo, useState} from "react";
import {ThreeCanvas} from "@remotion/three";
import {AbsoluteFill, continueRender, delayRender} from "remotion";
import * as THREE from "three";
import {At, FX, col, pop, rand, src, useFX, useTheme} from "../kit";

const VIEW_H = 2 * 8 * Math.tan((35 / 2) * (Math.PI / 180)); // visible height at z=0 for fov 35, camera z 8
const world = (x: number, y: number, w: number, h: number): [number, number, number] => [(x - 0.5) * VIEW_H * (w / h), (0.5 - y) * VIEW_H, 0];

const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[4, 6, 5]} intensity={1.6} />
    <directionalLight position={[-5, -2, 3]} intensity={0.5} />
  </>
);

/** Spinning 3D cube, one colour per face, with an optional label under it. p: colors[6], label, x, y, size, speed */
export const Cube3D: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out, width, height} = useFX(dur);
  const colors: string[] = p.colors ?? [pal.accent, pal.accent2, "#FF4D8D", "#22C55E", "#FFFFFF", "#111111"];
  const r = f * 0.045 * (p.speed ?? 1);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <ThreeCanvas width={width} height={height} camera={{fov: 35, position: [0, 0, 8]}}>
        <Lights />
        <mesh position={world(p.x ?? 0.5, p.y ?? 0.3, width, height)} rotation={[r * 0.7 + 0.4, r, 0]} scale={pop(f, fps) * (p.size ?? 1.5)}>
          <boxGeometry args={[1, 1, 1]} />
          {colors.slice(0, 6).map((c, i) => <meshStandardMaterial key={i} attach={`material-${i}`} color={col(pal, c)} roughness={0.35} metalness={0.15} />)}
        </mesh>
      </ThreeCanvas>
      {p.label && <At y={(p.y ?? 0.3) + 0.14}><div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 64, color: "#fff",
        textShadow: "0 4px 16px rgba(0,0,0,.6)", whiteSpace: "nowrap"}}>{p.label}</div></At>}
    </AbsoluteFill>
  );
};

/** An image (screenshot, product, thumbnail) on a 3D card that swings in and floats. p: image, x, y, size, tilt */
export const Card3D: FX = ({p, dur}) => {
  const {f, fps, out, width, height} = useFX(dur);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender("Card3D texture"));
  useEffect(() => {
    const url = src(p.image);
    if (!url) return continueRender(handle);
    new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; setTex(t); continueRender(handle); },
      undefined, () => continueRender(handle));
  }, [p.image, handle]);
  const img = tex?.image as HTMLImageElement | undefined;
  const aspect = img ? img.width / img.height : 16 / 9;
  const k = pop(f, fps, 0, 120, 15);
  const w = (p.size ?? 2.4) * (aspect >= 1 ? 1 : aspect), h = w / aspect;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <ThreeCanvas width={width} height={height} camera={{fov: 35, position: [0, 0, 8]}}>
        <Lights />
        <mesh position={world(p.x ?? 0.5, p.y ?? 0.32, width, height)}
          rotation={[0.12 + Math.sin(f / 25) * 0.05, (1 - k) * -1.2 + (p.tilt ?? -0.25) + Math.sin(f / 30) * 0.08, 0]}>
          <boxGeometry args={[w, h, 0.06]} />
          <meshStandardMaterial attach="material-4" map={tex ?? undefined} color={tex ? "#ffffff" : "#888888"} roughness={0.5} />
          {[0, 1, 2, 3, 5].map((i) => <meshStandardMaterial key={i} attach={`material-${i}`} color="#f5f5f5" roughness={0.6} />)}
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Hyperspace warp: streaks rushing at the camera (hype transition / tech intro). p: color, count, speed */
export const Warp3D: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, out, width, height} = useFX(dur);
  const n = p.count ?? 500;
  const base = useMemo(() => Array.from({length: n}, (_, i) => [(rand(i) - 0.5) * 14, (rand(i + 1e4) - 0.5) * 24, rand(i + 2e4) * 60]), [n]);
  const pos = useMemo(() => new Float32Array(n * 6), [n]);
  const speed = (p.speed ?? 1) * 1.2;
  base.forEach(([x, y, z0], i) => {
    const z = -60 + ((z0 + f * speed) % 60);
    pos.set([x, y, z, x, y, z - 1.5 - speed * 1.5], i * 6);
  });
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  geo.setAttribute("position", new THREE.BufferAttribute(pos.slice(), 3));
  return (
    <AbsoluteFill style={{opacity: out, mixBlendMode: "screen"}}>
      <ThreeCanvas width={width} height={height} camera={{fov: 70, position: [0, 0, 5]}}>
        <lineSegments geometry={geo}>
          <lineBasicMaterial color={col(pal, p.color, "accent2")} transparent opacity={0.9} />
        </lineSegments>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
