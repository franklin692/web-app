import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PublishButton } from "@/components/TopBar";

const TILES = [
  { to: "/info/promo", id: "promo", emoji: "🔥", title: "Promozioni & Volantini", sub: "Offerte, sconti e volantini di negozi, supermercati e locali", g: "from-orange-500/30 to-pink-600/10", b: "border-orange-400/40" },
  { to: "/info-utili?tab=fuel", id: "fuel", emoji: "⛽", title: "Prezzi Benzina", sub: "Benzina, Diesel e GPL: i distributori più economici", g: "from-emerald-500/30 to-sky-600/10", b: "border-emerald-400/40" },
  { to: "/info-utili?tab=info", id: "services", emoji: "🏛️", title: "Info Utili & Servizi", sub: "Scale mobili, farmacie, guardia medica, parcheggi, numeri utili", g: "from-sky-500/30 to-indigo-600/10", b: "border-sky-400/40" },
  { to: "/info/live", id: "live", emoji: "📡", title: "Segnalazioni Città & Affluenza Live", sub: "Zone, traffico, file e situazioni in tempo reale", g: "from-pink-500/30 to-violet-600/10", b: "border-pink-400/40" },
];

export default function InfoHub() {
  return (
    <div data-testid="info-page" className="px-5 pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Info · Promo · Utilità</p>
          <h1 className="mt-1 font-display text-4xl font-black tracking-tight">Info <span className="text-gradient">Potenza</span></h1>
        </div>
        <PublishButton testId="info-publish-button" className="mt-2" />
      </div>
      <p className="mt-2 text-sm text-zinc-400">Offerte delle attività, prezzi carburante, servizi e cosa succede in città adesso.</p>
      <div data-testid="info-grid" className="mt-6 flex flex-col gap-3">
        {TILES.map((t, i) => (
          <Link key={t.id} to={t.to} data-testid={`info-tile-${t.id}`} style={{ animationDelay: `${i * 60}ms` }}
            className={`fade-up flex items-center gap-4 rounded-3xl border ${t.b} bg-gradient-to-br ${t.g} p-5 transition-transform active:scale-[0.98]`}>
            <span className="text-4xl">{t.emoji}</span>
            <span className="min-w-0 flex-1"><span className="block font-display text-lg font-bold leading-tight">{t.title}</span><span className="text-xs text-zinc-300/80">{t.sub}</span></span>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
