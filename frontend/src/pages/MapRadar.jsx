import { Radar } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";

const SPOTS = [
  { top: "32%", left: "38%", c: "bg-orange-400", label: "Via Pretoria" },
  { top: "55%", left: "62%", c: "bg-pink-500", label: "Macchia Romana" },
  { top: "68%", left: "30%", c: "bg-violet-400", label: "Gallitello" },
  { top: "40%", left: "70%", c: "bg-sky-400", label: "Montereale" },
];

export default function MapRadar() {
  const cfg = useConfig();
  return (
    <div data-testid="map-page" className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
      <div className="relative h-72 w-72">
        {[0, 1, 2].map((i) => (
          <span key={i} className="radar-ring absolute inset-0 rounded-full border border-violet-500/40" style={{ animationDelay: `${i * 1}s` }} />
        ))}
        <div className="absolute inset-6 rounded-full border border-white/5" />
        <div className="absolute inset-16 rounded-full border border-white/5" />
        <div className="radar-sweep absolute inset-0 rounded-full" />
        {SPOTS.map((s) => (
          <span key={s.label} className={`absolute h-3 w-3 rounded-full ${s.c} live-dot shadow-[0_0_14px_currentColor]`} style={{ top: s.top, left: s.left }} />
        ))}
        <Radar className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-violet-300" />
      </div>
      <p className="mt-10 text-xs font-bold uppercase tracking-[0.3em] text-orange-300">In arrivo</p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight">Mappa Radar <span className="text-gradient">Live</span></h1>
      <p className="mt-3 max-w-xs text-sm text-zinc-400">{cfg?.texts.radar_text}</p>
    </div>
  );
}
