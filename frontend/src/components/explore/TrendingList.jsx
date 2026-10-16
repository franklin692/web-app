import { Flame } from "lucide-react";
import { imgUrl } from "@/lib/api";
import { TrendBadge } from "@/components/TrendBadge";
import { KINDS } from "@/lib/meta";

const rankCls = ["from-orange-400 to-pink-500", "from-pink-500 to-violet-500", "from-violet-500 to-indigo-500"];

export const TrendingList = ({ items, onOpen }) => {
  if (!items?.length) return null;
  return (
    <section data-testid="trending-section" className="mx-5 mt-8 rounded-3xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.08] to-transparent p-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Classifica live</p>
          <h2 className="font-display text-lg font-bold tracking-tight">Dove va Potenza stasera</h2>
        </div>
        <Flame className="flame-pulse h-7 w-7 text-orange-400" />
      </div>
      <ol className="flex flex-col gap-2">
        {items.slice(0, 6).map((it, i) => (
          <li key={it.id}>
            <button data-testid={`trending-item-${i}`} onClick={() => onOpen(it.id)} className="flex w-full items-center gap-3 rounded-2xl bg-[#16161F]/70 p-2 text-left transition-colors hover:bg-[#1E1E2C]">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-black text-white ${rankCls[i] || "from-zinc-700 to-zinc-800"}`}>{i + 1}</span>
              <img src={imgUrl(it.image_url)} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{it.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {it.level > 0 ? <TrendBadge level={it.level} count={it.display_count} /> : <span className="text-[11px] text-zinc-500">{KINDS[it.kind]?.label} · {it.zone || it.town}</span>}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};
