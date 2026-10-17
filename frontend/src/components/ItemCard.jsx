import { MapPin, Clock, Star } from "lucide-react";
import { whenLabel } from "@/lib/meta";
import { useCats } from "@/hooks/useConfig";
import { DynIcon } from "@/lib/icons";
import { imgUrl } from "@/lib/api";
import { TrendBadge } from "@/components/TrendBadge";

export const KindPill = ({ kind }) => {
  const k = useCats()[kind];
  if (!k) return null;
  return (
    <span style={{ color: k.color, background: `${k.color}22`, borderColor: `${k.color}55` }} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
      <DynIcon name={k.icon} className="h-3 w-3" /> {k.name}
    </span>
  );
};

export const ItemCard = ({ item, onOpen, index = 0 }) => {
  const when = whenLabel(item);
  return (
    <button
      data-testid={`item-card-${item.id}`}
      onClick={() => onOpen(item.id)}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className="fade-up group flex w-full gap-3 rounded-2xl border border-white/[0.08] bg-[#16161F]/80 p-3 text-left backdrop-blur-md transition-colors hover:border-violet-500/40 active:scale-[0.99]"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <img src={imgUrl(item.image_url)} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        {item.saved && <Star className="absolute right-1.5 top-1.5 h-4 w-4 fill-amber-300 text-amber-300 drop-shadow" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <KindPill kind={item.kind} />
          {item.live && <span className="live-dot rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-300">● LIVE</span>}
        </div>
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-white">{item.title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
          {when && <span className="inline-flex items-center gap-1 text-pink-300"><Clock className="h-3 w-3" />{when}</span>}
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.zone || item.town}{item.town !== "Potenza" && item.zone ? ` · ${item.town}` : ""}</span>
        </div>
        {item.level > 0 && <div><TrendBadge level={item.level} count={item.display_count} /></div>}
        {item.spotlight_count > 0 && <span data-testid={`spotlight-count-${item.id}`} className="w-fit rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">✨ {item.spotlight_count} nello Spotlight</span>}
      </div>
    </button>
  );
};
