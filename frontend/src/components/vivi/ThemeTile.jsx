import { Link } from "react-router-dom";
import { imgUrl } from "@/lib/api";
import { DynIcon } from "@/lib/icons";

export const ThemeTile = ({ t, big }) => (
  <Link to={`/vivi/${t.slug}`} data-testid={`theme-tile-${t.slug}`}
    style={{ background: `linear-gradient(140deg, ${t.color}55 0%, ${t.color}14 55%, #16161F 100%)`, borderColor: `${t.color}44` }}
    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-4 transition-transform active:scale-[0.97] ${big ? "min-h-[160px]" : "min-h-[128px] w-40 shrink-0 gap-2"}`}>
    {t.image_url && (
      <>
        <img src={imgUrl(t.image_url)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/50 to-transparent" />
      </>
    )}
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-lg" style={{ background: t.color }}><DynIcon name={t.icon} className="h-5 w-5 text-white" /></span>
    <div className="relative">
      <p className="font-display text-[15px] font-bold leading-tight text-white">{t.name}</p>
      {big && t.description && <p className="mt-1 line-clamp-2 text-[11px] text-zinc-300">{t.description}</p>}
      <p className="mt-1 text-[11px] font-semibold text-zinc-400">
        {t.count ? `${t.count} ${t.count === 1 ? "proposta" : "proposte"}` : "In arrivo"}
        {t.upcoming > 0 && <span className="text-pink-300"> · {t.upcoming} in programma</span>}
      </p>
    </div>
  </Link>
);

export const ViviShortcuts = ({ themes, title }) =>
  themes?.length ? (
    <section data-testid="vivi-shortcuts" className="mt-8">
      <div className="mb-3 flex items-end justify-between px-5">
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        <Link to="/vivi" data-testid="vivi-see-all" className="text-xs font-semibold text-violet-300">Vedi tutte →</Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
        {[...themes].sort((a, b) => (b.count > 0) - (a.count > 0)).map((t) => <ThemeTile key={t.slug} t={t} />)}
      </div>
    </section>
  ) : null;
