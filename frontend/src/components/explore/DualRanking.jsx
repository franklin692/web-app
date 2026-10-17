import { useState } from "react";
import { Flame } from "lucide-react";
import { imgUrl } from "@/lib/api";
import { whenLabel } from "@/lib/meta";
import { TrendBadge } from "@/components/TrendBadge";
import { useCats } from "@/hooks/useConfig";

const rankCls = ["from-orange-400 to-pink-500", "from-pink-500 to-violet-500", "from-violet-500 to-indigo-500"];
const TABS = [["live", "🔴 Dov'è Potenza ADESSO"], ["upcoming", "🔥 Dove si va"]];
const EMPTY = { live: "Ancora nessuno ha detto «Ci sono ORA». Sei in giro? Fallo tu per primo!", upcoming: "Niente in programma per i prossimi giorni… per ora." };

export const Discover = () => <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">Da scoprire ✨</span>;

const Row = ({ it, i, onOpen, tab }) => {
  const cats = useCats();
  const when = tab === "upcoming" ? whenLabel(it) : it.live ? "IN CORSO" : null;
  return (
    <li>
      <button data-testid={`ranking-${tab}-item-${i}`} onClick={() => onOpen(it.id)} className="flex w-full items-center gap-3 rounded-2xl bg-[#16161F]/70 p-2 text-left transition-colors hover:bg-[#1E1E2C]">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-black text-white ${rankCls[i] || "from-zinc-700 to-zinc-800"}`}>{i + 1}</span>
        <img src={imgUrl(it.image_url)} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{it.title}</p>
          <p className="truncate text-[11px] text-zinc-500">{when ? <span className="text-pink-300">{when} · </span> : null}{cats[it.kind]?.name} · {it.zone || it.town}</p>
          <div className="mt-1">{it.level > 0 ? <TrendBadge level={it.level} count={it.display_count} /> : <Discover />}</div>
        </div>
      </button>
    </li>
  );
};

export const DualRanking = ({ live, upcoming, onOpen, title }) => {
  const [tab, setTab] = useState(live?.length ? "live" : "upcoming");
  const items = (tab === "live" ? live : upcoming) || [];
  return (
    <section data-testid="dual-ranking" className="mx-5 mt-8 rounded-3xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.08] to-transparent p-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Classifica</p>
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        </div>
        <Flame className="flame-pulse h-7 w-7 text-orange-400" />
      </div>
      <div className="mb-3 flex rounded-2xl bg-black/30 p-1">
        {TABS.map(([k, l]) => (
          <button key={k} data-testid={`ranking-tab-${k}`} onClick={() => setTab(k)}
            className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-all ${tab === k ? "bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg" : "text-zinc-400"}`}>{l}</button>
        ))}
      </div>
      {!items.length && <p data-testid={`ranking-${tab}-empty`} className="py-6 text-center text-xs text-zinc-500">{EMPTY[tab]}</p>}
      <ol className="flex flex-col gap-2">{items.slice(0, 6).map((it, i) => <Row key={it.id} it={it} i={i} onOpen={onOpen} tab={tab} />)}</ol>
    </section>
  );
};
