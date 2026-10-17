import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, CalendarDays, Infinity as Always } from "lucide-react";
import { api, imgUrl } from "@/lib/api";
import { DynIcon } from "@/lib/icons";
import { useCats } from "@/hooks/useConfig";
import { ItemCard } from "@/components/ItemCard";
import { ItemDetailSheet } from "@/components/ItemDetailSheet";
import { Select } from "@/components/forms/Field";

const WHEN = [["all", "Tutto"], ["tonight", "Stasera"], ["weekend", "Weekend"], ["permanent", "Sempre disponibili"]];
const SORTS = { smart: "Consigliati", trend: "Più frequentati", az: "A–Z" };
const chip = (on) => `shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${on ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400"}`;

const Group = ({ title, icon: Icon, items, onOpen, testId }) =>
  items.length ? (
    <section data-testid={testId} className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold"><Icon className="h-4 w-4 text-pink-300" />{title}<span className="text-sm font-medium text-zinc-500">{items.length}</span></h2>
      <div className="flex flex-col gap-3">{items.map((it, i) => <ItemCard key={it.id} item={it} onOpen={onOpen} index={i} />)}</div>
    </section>
  ) : null;

export default function ViviTheme() {
  const { slug } = useParams();
  const nav = useNavigate();
  const cats = useCats();
  const [when, setWhen] = useState("all");
  const [kind, setKind] = useState("");
  const [town, setTown] = useState("");
  const [sort, setSort] = useState("smart");
  const [open, setOpen] = useState(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vivi", slug, when, kind, town, sort],
    queryFn: async () => (await api.get(`/vivi/${slug}`, { params: { when, kind, town, sort } })).data,
    placeholderData: (prev) => (prev?.theme?.slug === slug ? prev : undefined),
  });
  if (isError) return <p data-testid="theme-not-found" className="px-5 pt-16 text-center text-zinc-400">Categoria non disponibile. <Link to="/vivi" className="text-violet-300">Torna a Vivi Potenza</Link></p>;
  const t = data?.theme;
  const items = data?.items || [];
  const dated = items.filter((i) => cats[i.kind]?.dated);
  const perm = items.filter((i) => !cats[i.kind]?.dated);
  const filtered = when !== "all" || kind || town;

  return (
    <div data-testid="vivi-theme-page">
      <div className="relative overflow-hidden px-5 pb-6 pt-6" style={{ background: t ? `linear-gradient(160deg, ${t.color}40, transparent 70%)` : undefined }}>
        {t?.image_url && <img src={imgUrl(t.image_url)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <button data-testid="vivi-back-button" onClick={() => nav("/vivi")} className="relative mb-4 inline-flex items-center gap-1 text-sm text-zinc-300"><ArrowLeft className="h-4 w-4" /> Vivi Potenza</button>
        {t && (
          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg" style={{ background: t.color }}><DynIcon name={t.icon} className="h-6 w-6 text-white" /></span>
            <div className="min-w-0"><h1 data-testid="theme-title" className="font-display text-2xl font-black leading-tight tracking-tight">{t.name}</h1><p className="text-xs text-zinc-300">{t.description}</p></div>
          </div>
        )}
      </div>
      <div className="sticky top-12 z-30 border-b border-white/5 bg-[#0B0B0F]/85 px-5 py-3 backdrop-blur-xl">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {WHEN.map(([k, l]) => <button key={k} data-testid={`vivi-when-${k}`} onClick={() => setWhen(k)} className={chip(when === k)}>{l}</button>)}
        </div>
        <div className="mt-2 flex gap-2">
          {data?.facets.kinds.length > 1 && (
            <select data-testid="vivi-kind-select" value={kind} onChange={(e) => setKind(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#16161F] px-3 py-2.5 text-xs text-zinc-200">
              <option value="">Tutte le tipologie</option>{data.facets.kinds.map((k) => <option key={k} value={k}>{cats[k]?.plural || k}</option>)}
            </select>
          )}
          {data?.facets.towns.length > 1 && <div className="flex-1"><Select testId="vivi-town-select" value={town} onChange={setTown} options={data.facets.towns} placeholder="Tutti i comuni" /></div>}
          <select data-testid="vivi-sort-select" value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-white/10 bg-[#16161F] px-3 text-xs text-zinc-200">
            {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="px-5 pb-6">
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>}
        {data && items.length === 0 && (
          <div data-testid="vivi-empty" className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center">
            <DynIcon name={t.icon} className="h-10 w-10 text-zinc-600" />
            <p className="font-display text-lg font-bold">{filtered ? "Nessun risultato con questi filtri" : "Questa categoria si sta ancora riempiendo"}</p>
            <p className="text-sm text-zinc-400">{filtered ? "Prova a cambiare data, tipologia o comune." : "Conosci un evento, un corso o un posto che dovrebbe stare qui? Segnalalo: dopo l'approvazione lo vedranno tutti."}</p>
            {filtered ? (
              <button data-testid="vivi-reset-filters" onClick={() => { setWhen("all"); setKind(""); setTown(""); }} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold">Azzera filtri</button>
            ) : (
              <button data-testid="vivi-suggest-button" onClick={() => window.dispatchEvent(new CustomEvent("cfp-add", { detail: { themes: [slug] } }))} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-2.5 text-sm font-bold"><Plus className="h-4 w-4" /> Segnala qualcosa</button>
            )}
          </div>
        )}
        {when === "all" && !kind ? (
          <>
            <Group testId="vivi-group-dated" title="In programma" icon={CalendarDays} items={dated} onOpen={setOpen} />
            <Group testId="vivi-group-permanent" title="Sempre disponibili" icon={Always} items={perm} onOpen={setOpen} />
          </>
        ) : (
          <Group testId="vivi-group-results" title="Risultati" icon={CalendarDays} items={items} onOpen={setOpen} />
        )}
      </div>
      <ItemDetailSheet id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
