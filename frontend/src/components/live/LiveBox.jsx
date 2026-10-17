import { Link } from "react-router-dom";
import { Radio, Plus } from "lucide-react";
import { useLive, LiveRow, openLive } from "@/components/live/LiveRow";

export const PotenzaLiveBox = ({ title }) => {
  const { data } = useLive();
  const reports = data?.reports || [];
  return (
    <section data-testid="potenza-live-box" className="mx-5 mt-7 rounded-3xl border border-pink-500/25 bg-gradient-to-b from-pink-500/[0.08] to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="live-dot flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20"><Radio className="h-4 w-4 text-pink-300" /></span>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink-300">Ultime 3 ore</p>
          <h2 className="font-display text-lg font-bold leading-tight tracking-tight">{title || "Potenza Live"}</h2>
        </div>
        <button data-testid="live-box-report-button" onClick={() => openLive()} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-600 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(236,72,153,0.4)] active:scale-95">
          <Plus className="h-3.5 w-3.5" /> Segnala
        </button>
      </div>
      {data && !reports.length && <p data-testid="live-box-empty" className="rounded-2xl border border-dashed border-white/10 py-6 text-center text-xs text-zinc-500">Nessuna segnalazione recente. Sei in giro? Racconta com'è la situazione.</p>}
      <ul className="flex flex-col gap-2">{reports.slice(0, 4).map((r) => <LiveRow key={r.id} r={r} />)}</ul>
      <Link to="/info/live" data-testid="live-box-all-link" className="mt-3 inline-flex text-xs font-bold text-pink-300">Tutte le segnalazioni →</Link>
    </section>
  );
};

export const ItemLive = ({ item }) => {
  const { data } = useLive(item.id, item.zone || item.town || "");
  const reports = data?.reports || [];
  return (
    <div data-testid="item-live-section" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-pink-300">Potenza Live · qui</p>
        <button data-testid="item-live-report-button" onClick={() => openLive(item)} className="rounded-full border border-pink-400/40 bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-200">+ Segnala situazione</button>
      </div>
      {reports.length ? <ul className="flex flex-col gap-2">{reports.map((r) => <LiveRow key={r.id} r={r} />)}</ul> : <p className="text-xs text-zinc-500">Nessuna segnalazione nelle ultime 3 ore.</p>}
    </div>
  );
};
