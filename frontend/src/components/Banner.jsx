import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { api, imgUrl } from "@/lib/api";

export const BannerCard = ({ b, compact }) => {
  const go = () => {
    api.post(`/banners/${b.id}/click`).catch(() => {});
    if (b.link) window.open(b.link, "_blank", "noopener");
  };
  return (
    <button data-testid={`banner-${b.id}`} onClick={go} className="relative block w-full overflow-hidden rounded-3xl border border-amber-400/20 bg-[#16161F] text-left">
      {b.image_url && <img src={imgUrl(b.image_url)} alt={b.title} className={`w-full object-cover ${compact ? "h-28" : "h-36"}`} />}
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">Sponsorizzato</span>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-white">{b.title}</p>
          {b.text && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{b.text}</p>}
        </div>
        {b.cta && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-bold text-black">{b.cta}<ExternalLink className="h-3 w-3" /></span>}
      </div>
    </button>
  );
};

export const useBanners = (position) =>
  useQuery({ queryKey: ["banners", position], queryFn: async () => (await api.get("/banners", { params: { position } })).data, staleTime: 120_000 }).data || [];

export const BannerSlot = ({ position, className = "" }) => {
  const list = useBanners(position);
  if (!list.length) return null;
  return <div data-testid={`banner-slot-${position}`} className={`flex flex-col gap-3 ${className}`}>{list.map((b) => <BannerCard key={b.id} b={b} />)}</div>;
};
