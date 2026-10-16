import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { KINDS } from "@/lib/meta";
import { ItemCard } from "@/components/ItemCard";
import { FeaturedCarousel } from "@/components/explore/FeaturedCarousel";
import { TrendingList } from "@/components/explore/TrendingList";
import { ItemDetailSheet } from "@/components/ItemDetailSheet";

const TIMES = [{ id: "tonight", label: "Stasera" }, { id: "weekend", label: "Questo Weekend" }, { id: "all", label: "Tutti" }];
const CATS = [{ id: "", label: "Tutto" }, ...Object.entries(KINDS).map(([id, k]) => ({ id, label: k.plural }))];

const Header = () => {
  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <header className="relative overflow-hidden px-5 pb-2 pt-8">
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-pink-600/20 blur-3xl" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">{today}</p>
      <h1 className="relative mt-1 font-display text-4xl font-black leading-[0.95] tracking-tight">
        Cosa fare a<br /><span className="text-gradient">Potenza</span>
      </h1>
    </header>
  );
};

export default function Explore() {
  const { id } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [when, setWhen] = useState("tonight");
  const [kind, setKind] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const home = useQuery({ queryKey: ["home"], queryFn: async () => (await api.get("/home")).data });
  const list = useQuery({ queryKey: ["items", kind, when, dq], queryFn: async () => (await api.get("/items", { params: { kind, when, q: dq } })).data });
  const open = (iid) => nav(`/item/${iid}`);
  const showTop = !dq && !kind;

  return (
    <div data-testid="explore-page">
      <Header />
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0B0B0F]/85 px-5 pb-3 pt-3 backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input data-testid="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca eventi, locali, zone, paesi…"
            className="w-full rounded-2xl border border-white/10 bg-[#16161F] py-3 pl-11 pr-10 text-[15px] text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none" />
          {q && <button data-testid="search-clear" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><X className="h-4 w-4" /></button>}
        </div>
        <div className="mt-3 flex rounded-2xl bg-[#16161F] p-1">
          {TIMES.map((t) => (
            <button key={t.id} data-testid={`time-filter-${t.id}`} onClick={() => setWhen(t.id)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${when === t.id ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg" : "text-zinc-400"}`}>{t.label}</button>
          ))}
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {CATS.map((c) => (
            <button key={c.id || "all"} data-testid={`category-filter-${c.id || "all"}`} onClick={() => setKind(c.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${kind === c.id ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}>{c.label}</button>
          ))}
        </div>
      </div>

      {showTop && <FeaturedCarousel items={home.data?.featured} onOpen={open} />}
      {showTop && <TrendingList items={home.data?.trending} onOpen={open} />}

      <section className="mt-8 px-5">
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
          {dq ? `Risultati per “${dq}”` : kind ? KINDS[kind].plural : "Tutto a Potenza"}
          {list.data && <span className="ml-2 text-sm font-medium text-zinc-500">{list.data.length}</span>}
        </h2>
        {list.isLoading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>}
        {list.data?.length === 0 && <p data-testid="items-empty" className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">Niente qui per ora. Aggiungilo tu con il tasto +</p>}
        <div data-testid="items-list" className="flex flex-col gap-3">
          {list.data?.map((it, i) => <ItemCard key={it.id} item={it} onOpen={open} index={i} />)}
        </div>
      </section>
      <ItemDetailSheet id={id} onClose={() => nav("/")} />
    </div>
  );
}
