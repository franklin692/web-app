import { Link } from "react-router-dom";
import { Megaphone, ArrowRight } from "lucide-react";
import { DynIcon } from "@/lib/icons";

const LV = { info: "border-violet-400/40 bg-violet-500/15 text-violet-100", warn: "border-amber-400/40 bg-amber-500/15 text-amber-100", urgent: "border-red-400/50 bg-red-500/20 text-red-100" };

export const AlertBar = ({ alert }) => {
  if (!alert) return null;
  const inner = (
    <>
      <Megaphone className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-semibold">{alert.text}</span>
      {alert.link && <ArrowRight className="h-4 w-4" />}
    </>
  );
  const cls = `mx-5 mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 ${LV[alert.level] || LV.info}`;
  return alert.link ? <a data-testid="alert-bar" href={alert.link} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <div data-testid="alert-bar" className={cls}>{inner}</div>;
};

export const SectionTile = ({ s, big }) => (
  <Link to={`/bacheca/${s.slug}`} data-testid={`section-tile-${s.slug}`}
    style={{ background: `linear-gradient(140deg, ${s.color}55 0%, ${s.color}14 55%, #16161F 100%)`, borderColor: `${s.color}44` }}
    className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-4 transition-transform active:scale-[0.97] ${big ? "min-h-[150px]" : "h-28 w-36 shrink-0"}`}>
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: s.color }}><DynIcon name={s.icon} className="h-5 w-5 text-white" /></span>
    <div>
      <p className="font-display text-[15px] font-bold leading-tight text-white">{s.name}</p>
      {big && s.description && <p className="mt-1 line-clamp-2 text-[11px] text-zinc-300">{s.description}</p>}
      <p className="mt-1 text-[11px] font-semibold text-zinc-400">{s.count} {s.count === 1 ? "annuncio" : "annunci"}</p>
    </div>
  </Link>
);

export const BoardShortcuts = ({ sections, title }) =>
  sections?.length ? (
    <section data-testid="board-shortcuts" className="mt-8">
      <h2 className="mb-3 px-5 font-display text-lg font-bold tracking-tight">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">{sections.map((s) => <SectionTile key={s.slug} s={s} />)}</div>
    </section>
  ) : null;
