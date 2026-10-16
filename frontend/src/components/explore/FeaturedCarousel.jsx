import { Sparkles, MapPin } from "lucide-react";
import { imgUrl } from "@/lib/api";
import { whenLabel } from "@/lib/meta";
import { KindPill } from "@/components/ItemCard";
import { TrendBadge } from "@/components/TrendBadge";

export const FeaturedCarousel = ({ items, onOpen, title }) => {
  if (!items?.length) return null;
  return (
    <section data-testid="featured-section" className="mt-7">
      <h2 className="mb-3 flex items-center gap-2 px-5 font-display text-lg font-bold tracking-tight">
        <Sparkles className="h-5 w-5 text-pink-400" /> {title}
      </h2>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
        {items.map((it) => (
          <button
            key={it.id}
            data-testid={`featured-card-${it.id}`}
            onClick={() => onOpen(it.id)}
            className="group relative h-64 w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 text-left shadow-[0_10px_40px_rgba(236,72,153,0.15)] transition-transform active:scale-[0.98]"
          >
            <img src={imgUrl(it.image_url)} alt={it.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/40 to-transparent" />
            <div className="absolute left-3 top-3 flex gap-2">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">⭐ In evidenza</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
              <KindPill kind={it.kind} />
              <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-white">{it.title}</h3>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                {whenLabel(it) && <span className="font-semibold text-pink-300">{whenLabel(it)}</span>}
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{it.zone || it.town}</span>
              </div>
              {it.level > 0 && <div><TrendBadge level={it.level} count={it.display_count} /></div>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
