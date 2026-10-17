import { Fragment, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2, Dices, Sparkles, Fuel } from "lucide-react";
import { api, imgUrl } from "@/lib/api";
import { useConfig, askLogin } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";
import { ItemCard } from "@/components/ItemCard";
import { FeaturedCarousel } from "@/components/explore/FeaturedCarousel";
import { DualRanking } from "@/components/explore/DualRanking";
import { PollCard } from "@/components/explore/PollCard";
import { AlertBar, BoardShortcuts } from "@/components/explore/HomeBlocks";
import { SurpriseSheet } from "@/components/explore/SurpriseSheet";
import { ExploreFooter } from "@/components/explore/ExploreFooter";
import { PotenzaLiveBox } from "@/components/live/LiveBox";
import { ViviShortcuts } from "@/components/vivi/ThemeTile";
import { BannerSlot, BannerCard, useBanners } from "@/components/Banner";
import { ItemDetailSheet } from "@/components/ItemDetailSheet";

const SPOT = "__spotlight";

const Header = ({ cfg }) => {
  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <header className="relative overflow-hidden px-5 pb-2 pt-8">
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-pink-600/20 blur-3xl" />
      <div className="relative flex items-center gap-2">
        {cfg?.logo_url && <img src={imgUrl(cfg.logo_url)} alt="" className="h-7 w-7 rounded-lg object-cover" />}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">{today}</p>
      </div>
      <h1 data-testid="home-title" className="relative mt-1 font-display text-4xl font-black leading-[0.95] tracking-tight">
        {cfg?.home.title}<br /><span className="text-gradient">{cfg?.home.subtitle}</span>
      </h1>
    </header>
  );
};

const ItemsList = ({ items, onOpen }) => {
  const ads = useBanners("list");
  const n = Math.max(2, Number(ads[0]?.every_n) || 5);
  return items.map((it, i) => (
    <Fragment key={it.id}>
      <ItemCard item={it} onOpen={onOpen} index={i} />
      {ads.length > 0 && (i + 1) % n === 0 && <BannerCard compact b={ads[((i + 1) / n - 1) % ads.length]} />}
    </Fragment>
  ));
};

const chip = "shrink-0 inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors";

export default function Explore() {
  const { id } = useParams();
  const nav = useNavigate();
  const cfg = useConfig();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [when, setWhen] = useState("tonight");
  const [kind, setKind] = useState("");
  const [surprise, setSurprise] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (!user && kind === SPOT) setKind(""); }, [user, kind]);

  const spot = kind === SPOT;
  const home = useQuery({ queryKey: ["home"], queryFn: async () => (await api.get("/home")).data });
  const list = useQuery({
    queryKey: spot ? ["items", "spotlight"] : ["items", kind, when, dq],
    queryFn: async () => (spot ? await api.get("/spotlight/places") : await api.get("/items", { params: { kind, when, q: dq } })).data,
  });
  const open = (iid) => nav(`/item/${iid}`);
  const showTop = !dq && !kind;
  const tl = cfg?.home.time_labels || {};
  const cats = [{ slug: "", plural: "Tutto" }, ...(cfg?.categories || [])];
  const blocks = (cfg?.home.blocks || []).filter((b) => b.enabled && (showTop || b.id === "list"));
  const listTitle = (b) => (spot ? "Spotlight ✨ · persone attive ora" : dq ? `Risultati per “${dq}”` : kind ? cfg.categories.find((c) => c.slug === kind)?.plural : b.label);

  const render = (b) => {
    switch (b.id) {
      case "alert": return <AlertBar key={b.id} alert={cfg.home.alert} />;
      case "live": return <PotenzaLiveBox key={b.id} title={b.label} />;
      case "poll": return <PollCard key={b.id} title={b.label} />;
      case "banner": return <BannerSlot key={b.id} position="home_top" className="mx-5 mt-7" />;
      case "featured": return <FeaturedCarousel key={b.id} title={b.label} items={home.data?.featured} onOpen={open} />;
      case "trending": return home.data ? <DualRanking key={b.id} title={b.label} live={home.data.live} upcoming={home.data.upcoming} onOpen={open} /> : null;
      case "vivi": return <ViviShortcuts key={b.id} title={b.label} themes={cfg.themes} />;
      case "board": return <BoardShortcuts key={b.id} title={b.label} sections={cfg.sections} />;
      case "list":
        return (
          <section key={b.id} className="mt-8 px-5">
            {showTop && <BannerSlot position="home_mid" className="mb-6" />}
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
              {listTitle(b)}
              {list.data && <span className="ml-2 text-sm font-medium text-zinc-500">{list.data.length}</span>}
            </h2>
            {list.isLoading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>}
            {list.data?.length === 0 && <p data-testid="items-empty" className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">{spot ? "Nessuno nello Spotlight ora. Premi «Ci sono ORA» dove sei e accendilo tu ✨" : "Niente qui per ora. Aggiungilo tu con il tasto +"}</p>}
            <div data-testid="items-list" className="flex flex-col gap-3">{list.data && <ItemsList items={list.data} onOpen={open} />}</div>
          </section>
        );
      default: return null;
    }
  };

  return (
    <div data-testid="explore-page">
      <Header cfg={cfg} />
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0B0B0F]/85 px-5 pb-3 pt-3 backdrop-blur-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input data-testid="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca eventi, locali, zone, paesi…"
            className="w-full rounded-2xl border border-white/10 bg-[#16161F] py-3 pl-11 pr-10 text-[15px] text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none" />
          {q && <button data-testid="search-clear" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><X className="h-4 w-4" /></button>}
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 rounded-2xl bg-[#16161F] p-1">
            {["tonight", "weekend", "all"].map((t) => (
              <button key={t} data-testid={`time-filter-${t}`} onClick={() => setWhen(t)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${when === t ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg" : "text-zinc-400"}`}>{tl[t]}</button>
            ))}
          </div>
          <button data-testid="surprise-button" onClick={() => setSurprise(true)} className="flex shrink-0 items-center gap-1 rounded-2xl border border-orange-400/40 bg-gradient-to-br from-orange-500/20 to-pink-500/20 px-3 text-xs font-bold text-orange-100 active:scale-95">
            <Dices className="h-4 w-4" /> Sorprendimi
          </button>
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <button data-testid="category-filter-spotlight" onClick={() => (user ? setKind(spot ? "" : SPOT) : askLogin())}
            className={`${chip} ${spot ? "border-violet-300 bg-violet-500/30 text-white" : "border-violet-400/40 bg-violet-500/10 text-violet-200"}`}><Sparkles className="h-3.5 w-3.5" /> Spotlight</button>
          <Link to="/info-utili" data-testid="explore-fuel-link" className={`${chip} border-emerald-400/40 bg-emerald-500/10 text-emerald-200`}><Fuel className="h-3.5 w-3.5" /> Benzina & Info</Link>
          {cats.map((c) => (
            <button key={c.slug || "all"} data-testid={`category-filter-${c.slug || "all"}`} onClick={() => setKind(c.slug)}
              className={`${chip} ${kind === c.slug ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}>{c.plural}</button>
          ))}
        </div>
      </div>
      {cfg && blocks.map(render)}
      {showTop && <ExploreFooter />}
      <SurpriseSheet open={surprise} onClose={() => setSurprise(false)} onOpen={open} />
      <ItemDetailSheet id={id} onClose={() => nav("/")} />
    </div>
  );
}
