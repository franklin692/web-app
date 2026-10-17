import { useConfig } from "@/hooks/useConfig";
import { SectionTile } from "@/components/explore/HomeBlocks";
import { BannerSlot } from "@/components/Banner";
import { ProposalCard } from "@/components/ProposalSheet";
import { PublishButton } from "@/components/TopBar";

export default function Board() {
  const cfg = useConfig();
  return (
    <div data-testid="board-page" className="px-5 pt-8">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-pink-600/20 blur-3xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">Annunci · Spotted · Passaggi</p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="mt-1 font-display text-4xl font-black tracking-tight">La <span className="text-gradient-warm">Bacheca</span></h1>
        <PublishButton testId="board-publish-button" className="mt-2" />
      </div>
      <p className="mt-2 text-sm text-zinc-400">Tutto quello che la città si dice. Usa «＋ Pubblica» per scrivere.</p>
      <BannerSlot position="board" className="mt-5" />
      <div data-testid="board-grid" className="mt-6 grid grid-cols-2 gap-3">
        {cfg?.sections.map((s) => <SectionTile key={s.slug} s={s} big />)}
      </div>
      <ProposalCard area="bacheca" testId="board-proposal-card" />
    </div>
  );
}
