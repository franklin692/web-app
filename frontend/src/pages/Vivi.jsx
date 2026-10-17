import { Link } from "react-router-dom";
import { Fuel, ChevronRight } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { ThemeTile } from "@/components/vivi/ThemeTile";
import { ProposalCard } from "@/components/ProposalSheet";

export default function Vivi() {
  const cfg = useConfig();
  const themes = [...(cfg?.themes || [])].sort((a, b) => (b.count > 0) - (a.count > 0));
  return (
    <div data-testid="vivi-page" className="px-5 pt-8">
      <div className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Eventi · Luoghi · Esperienze</p>
      <h1 className="mt-1 font-display text-4xl font-black tracking-tight">Vivi <span className="text-gradient">Potenza</span></h1>
      <p className="mt-2 text-sm text-zinc-400">Non sai ancora cosa cercare? Scegli cosa ti va di fare e scopri tutto quello che offre il territorio.</p>
      <Link to="/info-utili" data-testid="vivi-utility-tile" className="mt-6 flex items-center gap-3 rounded-3xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 via-sky-500/10 to-transparent p-4 transition-transform active:scale-[0.98]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg"><Fuel className="h-5 w-5 text-white" /></span>
        <span className="flex-1"><span className="block font-display font-bold">Prezzi Benzina & Info Utili ⛽</span><span className="text-xs text-zinc-400">Distributori più economici, farmacie, scale mobili, parcheggi</span></span>
        <ChevronRight className="h-5 w-5 text-zinc-400" />
      </Link>
      <div data-testid="vivi-grid" className="mt-4 grid grid-cols-2 gap-3">
        {themes.map((t) => <ThemeTile key={t.slug} t={t} big />)}
      </div>
      <ProposalCard area="vivi" testId="vivi-proposal-card" />
    </div>
  );
}
