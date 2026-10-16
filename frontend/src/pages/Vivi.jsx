import { useConfig } from "@/hooks/useConfig";
import { ThemeTile } from "@/components/vivi/ThemeTile";

export default function Vivi() {
  const cfg = useConfig();
  return (
    <div data-testid="vivi-page" className="px-5 pt-8">
      <div className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Eventi · Luoghi · Esperienze</p>
      <h1 className="mt-1 font-display text-4xl font-black tracking-tight">Vivi <span className="text-gradient">Potenza</span></h1>
      <p className="mt-2 text-sm text-zinc-400">Non sai ancora cosa cercare? Scegli cosa ti va di fare e scopri tutto quello che offre il territorio.</p>
      <div data-testid="vivi-grid" className="mt-6 grid grid-cols-2 gap-3">
        {cfg?.themes.map((t) => <ThemeTile key={t.slug} t={t} big />)}
      </div>
    </div>
  );
}
