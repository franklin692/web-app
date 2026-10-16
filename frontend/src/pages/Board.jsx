import { useConfig } from "@/hooks/useConfig";
import { SectionTile } from "@/components/explore/HomeBlocks";
import { BannerSlot } from "@/components/Banner";

export default function Board() {
  const cfg = useConfig();
  return (
    <div data-testid="board-page" className="px-5 pt-8">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-pink-600/20 blur-3xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">Annunci · Spotted · Passaggi</p>
      <h1 className="mt-1 font-display text-4xl font-black tracking-tight">La <span className="text-gradient-warm">Bacheca</span></h1>
      <p className="mt-2 text-sm text-zinc-400">Tutto quello che la città si dice. Usa il tasto + per pubblicare.</p>
      <BannerSlot position="board" className="mt-5" />
      <div data-testid="board-grid" className="mt-6 grid grid-cols-2 gap-3">
        {cfg?.sections.map((s) => <SectionTile key={s.slug} s={s} big />)}
      </div>
    </div>
  );
}
