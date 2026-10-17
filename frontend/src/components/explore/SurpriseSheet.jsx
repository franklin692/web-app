import { useQuery } from "@tanstack/react-query";
import { Dices, Share2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { shareLink } from "@/lib/share";
import { Sheet } from "@/components/Sheet";
import { ItemCard } from "@/components/ItemCard";

export const SurpriseSheet = ({ open, onClose, onOpen }) => {
  const { data, refetch, isFetching } = useQuery({ queryKey: ["surprise"], queryFn: async () => (await api.get("/surprise")).data, enabled: open, staleTime: 0 });
  const share = () => shareLink("/", "Sorprendimi 🎲", `Stasera a Potenza: ${(data || []).map((x) => x.title).join(" · ")}`);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} testId="surprise-sheet" title="Sorprendimi 🎲" subtitle="3 idee a caso tra stasera e il weekend">
      <div className="flex flex-col gap-3">
        {isFetching && !data && <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-400" />}
        {data?.length === 0 && <p data-testid="surprise-empty" className="py-8 text-center text-sm text-zinc-500">Ancora niente da pescare: aggiungi tu qualcosa con il tasto +</p>}
        <div data-testid="surprise-list" className="flex flex-col gap-3">{data?.map((it, i) => <ItemCard key={it.id} item={it} index={i} onOpen={(id) => { onClose(); onOpen(id); }} />)}</div>
        <div className="mt-2 flex gap-3">
          <button data-testid="surprise-reroll-button" onClick={() => refetch()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 py-3 text-sm font-bold text-white active:scale-[0.98]">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />} Pesca di nuovo
          </button>
          <button data-testid="surprise-share-button" onClick={share} disabled={!data?.length} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-zinc-200 disabled:opacity-40">
            <Share2 className="h-4 w-4" /> Condividi
          </button>
        </div>
      </div>
    </Sheet>
  );
};
