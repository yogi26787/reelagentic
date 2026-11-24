import React from "react";
import {interpolate} from "remotion";
import {At, FX, card, clamp, col, ease, fmtMoney, glass, pop, useFX, useTheme} from "../kit";

/** Counting money / number. p: from, to, currency ("₹" | "$" | ""), suffix, label, y, decimals */
export const MoneyCounter: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const cf = Math.min(dur - 12, p.countFrames ?? 40);
  const v = interpolate(f, [0, cf], [p.from ?? 0, p.to ?? 100000], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 4)});
  const bump = f > cf ? 1 + 0.08 * Math.max(0, 1 - (f - cf) / 8) : 1;
  return (
    <At y={p.y ?? 0.24} w="94%" style={{textAlign: "center", opacity: out, transform: `translate(-50%,-50%) scale(${pop(f, fps) * bump})`}}>
      {p.label && <div style={{fontFamily: pal.body, fontWeight: 700, fontSize: 44, color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,.7)"}}>{p.label}</div>}
      <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: p.size ?? 150, color: col(pal, p.color, "accent"), WebkitTextStroke: "10px rgba(0,0,0,.85)",
        paintOrder: "stroke fill", fontVariantNumeric: "tabular-nums"}}>
        {p.currency === "" ? Math.round(v).toLocaleString("en-IN") : fmtMoney(v, p.currency ?? "₹", p.decimals ?? 0)}{p.suffix ?? ""}
      </div>
    </At>
  );
};

/** Glass bar chart. p: title, bars[{label, value, color?}], unit, y, highlight (index) */
export const BarChart: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const bars: any[] = p.bars ?? [];
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <At y={p.y ?? 0.3} w={900} style={{opacity: out, transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * pop(f, fps)})`}}>
      <div style={{...glass(pal, true), padding: "34px 40px"}}>
        {p.title && <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 52, color: "#fff", marginBottom: 26}}>{p.title}</div>}
        <div style={{display: "flex", alignItems: "flex-end", gap: 26, height: 440}}>
          {bars.map((b, i) => {
            const g = ease(f, 6 + i * 4, 26 + i * 4);
            const hi = p.highlight === i;
            return (
              <div key={i} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%"}}>
                <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 36, color: "#fff", opacity: g}}>{Math.round(b.value * g).toLocaleString("en-IN")}{p.unit ?? ""}</div>
                <div style={{width: "100%", height: `${(b.value / max) * 80 * g}%`, borderRadius: 18, marginTop: 10,
                  background: `linear-gradient(180deg, ${col(pal, b.color, hi ? "accent" : "accent2")}, rgba(255,255,255,0.15))`,
                  border: "1.5px solid rgba(255,255,255,.35)", boxShadow: hi ? `0 0 40px ${pal.accent}` : "none"}} />
                <div style={{fontFamily: pal.body, fontSize: 30, color: "#ddd", marginTop: 12, textAlign: "center"}}>{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </At>
  );
};

/** Progress rings. p: rings[{label, value (0-100)}], y */
export const ProgressRings: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const rings: any[] = p.rings ?? [{label: "", value: 75}];
  const R = 110, C = 2 * Math.PI * R;
  return (
    <At y={p.y ?? 0.28} style={{display: "flex", gap: 40, opacity: out}}>
      {rings.map((r, i) => {
        const g = ease(f, 4 + i * 5, 34 + i * 5);
        const c = col(pal, r.color, i % 2 ? "accent2" : "accent");
        return (
          <div key={i} style={{...glass(pal, true), padding: 26, textAlign: "center", transform: `scale(${pop(f, fps, i * 4)})`}}>
            <svg width={2 * R + 40} height={2 * R + 40}>
              <circle cx={R + 20} cy={R + 20} r={R} stroke="rgba(255,255,255,.15)" strokeWidth={26} fill="none" />
              <circle cx={R + 20} cy={R + 20} r={R} stroke={c} strokeWidth={26} fill="none" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - (r.value / 100) * g)} transform={`rotate(-90 ${R + 20} ${R + 20})`} />
              <text x="50%" y="54%" textAnchor="middle" fill="#fff" fontSize={64} fontWeight={800} fontFamily={pal.display}>{Math.round(r.value * g)}%</text>
            </svg>
            <div style={{fontFamily: pal.body, fontWeight: 700, fontSize: 34, color: "#fff"}}>{r.label}</div>
          </div>
        );
      })}
    </At>
  );
};

/** Stock ticker card with a line drawing itself. p: symbol, name, price, change (%), points[], y */
export const StockTicker: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const pts: number[] = p.points ?? [10, 12, 11, 14, 13, 17, 16, 21, 24];
  const up = (p.change ?? 1) >= 0;
  const c = up ? "#22C55E" : "#EF4444";
  const W = 820, H = 300, mn = Math.min(...pts), mx = Math.max(...pts);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(i / (pts.length - 1)) * W},${H - ((v - mn) / (mx - mn || 1)) * (H - 20) - 10}`).join(" ");
  const g = ease(f, 6, Math.min(dur - 10, 45));
  return (
    <At y={p.y ?? 0.28} w={900} style={{opacity: out, transform: `translate(-50%,-50%) translateY(${(1 - pop(f, fps)) * 80}px)`}}>
      <div style={{...card({...pal, bg: "#0B0F14", fg: "#fff"}), padding: 40}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
          <div>
            <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 60, color: "#fff"}}>{p.symbol ?? "NIFTY"}</div>
            <div style={{fontFamily: pal.body, fontSize: 30, color: "#9CA3AF"}}>{p.name}</div>
          </div>
          <div style={{textAlign: "right"}}>
            <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 56, color: "#fff"}}>{p.price}</div>
            <div style={{fontFamily: pal.body, fontWeight: 800, fontSize: 36, color: c}}>{up ? "▲" : "▼"} {Math.abs(p.change ?? 1).toFixed(2)}%</div>
          </div>
        </div>
        <svg width={W} height={H} style={{marginTop: 20}}>
          <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity={0.35} /><stop offset="1" stopColor={c} stopOpacity={0} /></linearGradient></defs>
          <clipPath id="sc"><rect width={W * g} height={H} /></clipPath>
          <g clipPath="url(#sc)">
            <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#sg)" />
            <path d={d} stroke={c} strokeWidth={7} fill="none" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
    </At>
  );
};

/** Price drop: old price struck out, new price slams in. p: product, image?, old, now, currency, y, tag */
export const PriceDrop: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const strike = ease(f, 10, 18);
  const s = pop(f, fps, 20, 260, 15);
  const cur = p.currency ?? "₹";
  return (
    <At y={p.y ?? 0.27} w={820} style={{opacity: out, transform: `translate(-50%,-50%) scale(${pop(f, fps)})`}}>
      <div style={{...card(pal), padding: 40, textAlign: "center"}}>
        {p.product && <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 50}}>{p.product}</div>}
        <div style={{position: "relative", display: "inline-block", fontFamily: pal.display, fontWeight: 700, fontSize: 80, color: pal.muted, marginTop: 10}}>
          {fmtMoney(p.old ?? 999, cur)}
          <div style={{position: "absolute", left: 0, top: "52%", height: 10, background: "#EF4444", width: `${strike * 100}%`, borderRadius: 5}} />
        </div>
        <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 150, color: "#16A34A", transform: `scale(${s})`}}>{fmtMoney(p.now ?? 0, cur)}</div>
        {p.tag && <div style={{display: "inline-block", background: pal.accent, color: "#111", fontWeight: 900, fontSize: 40, padding: "8px 24px", borderRadius: 12,
          fontFamily: pal.display, transform: `rotate(-4deg) scale(${pop(f, fps, 28)})`}}>{p.tag}</div>}
      </div>
    </At>
  );
};

/** Checklist ticking off. p: title, items[], y */
export const Checklist: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const items: string[] = p.items ?? [];
  const per = Math.max(6, Math.floor((dur - 16) / Math.max(1, items.length)));
  return (
    <At y={p.y ?? 0.3} w={860} style={{opacity: out}}>
      <div style={{...card(pal), padding: "36px 44px", transform: `scale(${pop(f, fps)})`}}>
        {p.title && <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 56, marginBottom: 18}}>{p.title}</div>}
        {items.map((it, i) => {
          const s = pop(f, fps, 6 + i * per, 220, 14);
          return (
            <div key={i} style={{display: "flex", alignItems: "center", gap: 24, margin: "16px 0", opacity: 0.35 + 0.65 * Math.min(1, s)}}>
              <div style={{width: 64, height: 64, borderRadius: 16, border: `5px solid ${pal.accent2}`, background: s > 0.5 ? pal.accent2 : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 44, fontWeight: 900, transform: `scale(${0.8 + 0.2 * s})`}}>{s > 0.5 ? "✓" : ""}</div>
              <div style={{fontFamily: pal.body, fontWeight: 700, fontSize: 46}}>{it}</div>
            </div>
          );
        })}
      </div>
    </At>
  );
};

/** Myth vs fact flip. p: myth, fact, y */
export const MythFact: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const flipAt = p.flipAt ? p.flipAt * fps : dur * 0.45;
  const r = interpolate(f, [flipAt, flipAt + 10], [0, 180], clamp);
  const fact = r > 90;
  return (
    <At y={p.y ?? 0.27} w={860} style={{opacity: out, perspective: 1800}}>
      <div style={{...card(pal), padding: 44, textAlign: "center", transform: `rotateY(${fact ? r - 180 : r}deg) scale(${pop(f, fps)})`,
        border: `8px solid ${fact ? "#16A34A" : "#DC2626"}`}}>
        <div style={{display: "inline-block", fontFamily: pal.display, fontWeight: 900, fontSize: 44, color: "#fff", background: fact ? "#16A34A" : "#DC2626",
          padding: "6px 26px", borderRadius: 12}}>{fact ? "✅ FACT" : "❌ MYTH"}</div>
        <div style={{fontFamily: pal.display, fontWeight: 800, fontSize: 58, marginTop: 22, lineHeight: 1.15}}>{fact ? p.fact : p.myth}</div>
      </div>
    </At>
  );
};

/** Tier list filling up. p: tiers[{name:"S", items:[text|image]}], y */
export const TierList: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const tiers: any[] = p.tiers ?? [];
  const colors = ["#FF7F7F", "#FFBF7F", "#FFDF7F", "#BFFF7F", "#7FBFFF"];
  let k = 0;
  return (
    <At y={p.y ?? 0.3} w={940} style={{opacity: out}}>
      {tiers.map((t, i) => (
        <div key={i} style={{display: "flex", background: "#1A1A1A", marginBottom: 6, minHeight: 130}}>
          <div style={{width: 140, background: t.color ?? colors[i % 5], display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: pal.display, fontWeight: 900, fontSize: 70, color: "#111"}}>{t.name}</div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 10, padding: 10, alignItems: "center"}}>
            {(t.items ?? []).map((it: string, j: number) => {
              const s = pop(f, fps, 6 + k++ * (p.every ?? 6), 220, 13);
              return <div key={j} style={{background: "#fff", borderRadius: 12, padding: "14px 22px", fontFamily: pal.body, fontWeight: 800, fontSize: 36,
                transform: `scale(${s}) translateY(${(1 - s) * -60}px)`}}>{it}</div>;
            })}
          </div>
        </div>
      ))}
    </At>
  );
};

/** Side-by-side comparison. p: left{title, points[]}, right{title, points[]}, y */
export const Versus: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  const side = (s: any, i: number) => {
    const g = pop(f, fps, i * 6);
    return (
      <div style={{...card(pal), flex: 1, padding: 30, transform: `translateX(${(1 - g) * (i ? 500 : -500)}px)`,
        border: `6px solid ${i ? pal.accent2 : pal.accent}`}}>
        <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 48, marginBottom: 14}}>{s?.title}</div>
        {(s?.points ?? []).map((t: string, j: number) => <div key={j} style={{fontFamily: pal.body, fontSize: 34, margin: "10px 0", opacity: ease(f, 10 + j * 5, 16 + j * 5)}}>• {t}</div>)}
      </div>
    );
  };
  return (
    <At y={p.y ?? 0.3} w={980} style={{opacity: out, display: "flex", gap: 22, alignItems: "stretch"}}>
      {side(p.left, 0)}
      <div style={{alignSelf: "center", fontFamily: pal.display, fontWeight: 900, fontSize: 64, color: "#fff", textShadow: "0 4px 14px #000", transform: `scale(${pop(f, fps, 10)})`}}>VS</div>
      {side(p.right, 1)}
    </At>
  );
};

/** Big stat with label. p: value, label, y, color */
export const StatCard: FX = ({p, dur}) => {
  const pal = useTheme();
  const {f, fps, out} = useFX(dur);
  return (
    <At y={p.y ?? 0.25} style={{opacity: out, transform: `translate(-50%,-50%) scale(${pop(f, fps)})`}}>
      <div style={{...glass(pal, true), padding: "30px 60px", textAlign: "center"}}>
        <div style={{fontFamily: pal.display, fontWeight: 900, fontSize: 160, lineHeight: 1, color: col(pal, p.color, "accent")}}>{p.value}</div>
        <div style={{fontFamily: pal.body, fontWeight: 700, fontSize: 44, color: "#fff", marginTop: 8}}>{p.label}</div>
      </div>
    </At>
  );
};
