import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send, Plus, MapPin, CalendarClock, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, imgUrl, errMsg } from "@/lib/api";
import { askLogin } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";
import { Sheet } from "@/components/Sheet";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";
import { ImageInput } from "@/components/forms/ImageInput";

const EMPTY = { title: "", business: "", description: "", image_url: "", valid_until: "", link: "", zone: "" };

export const PromoForm = ({ onDone }) => {
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async () => {
    if (f.title.trim().length < 2 || f.business.trim().length < 2) return toast.error("Inserisci titolo e nome dell'attività");
    setBusy(true);
    try {
      const { data } = await api.post("/promos", f);
      qc.invalidateQueries({ queryKey: ["promos"] });
      setDone(data.status === "approved" ? "Promozione pubblicata!" : "Promozione inviata: sarà visibile dopo l'approvazione della redazione.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  if (done) return (
    <div data-testid="promo-success" className="flex flex-col items-center gap-3 py-6 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-400" /><p className="text-sm text-zinc-200">{done}</p>
      <PrimaryButton data-testid="promo-success-close" onClick={onDone}>Chiudi</PrimaryButton>
    </div>
  );
  return (
    <div data-testid="promo-form" className="flex flex-col gap-4">
      <Field label="Titolo della promo"><input data-testid="promo-title-input" maxLength={120} className={inputCls} value={f.title} onChange={set("title")} placeholder="Es. -30% sulle pizze il martedì" /></Field>
      <Field label="Attività / Negozio"><input data-testid="promo-business-input" maxLength={80} className={inputCls} value={f.business} onChange={set("business")} /></Field>
      <Field label="Dettagli"><textarea data-testid="promo-description-input" rows={3} maxLength={1000} className={inputCls} value={f.description} onChange={set("description")} /></Field>
      <ImageInput value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} label="Volantino / Foto" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valida fino al"><input data-testid="promo-until-input" type="date" className={inputCls} value={f.valid_until} onChange={set("valid_until")} /></Field>
        <Field label="Zona"><input data-testid="promo-zone-input" className={inputCls} value={f.zone} onChange={set("zone")} /></Field>
      </div>
      <Field label="Link (facoltativo)"><input data-testid="promo-link-input" className={inputCls} value={f.link} onChange={set("link")} placeholder="https://…" /></Field>
      <PrimaryButton data-testid="promo-submit-button" onClick={send} disabled={busy}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Invia promozione</PrimaryButton>
    </div>
  );
};

const PromoCard = ({ p }) => (
  <li data-testid={`promo-card-${p.id}`} className="overflow-hidden rounded-3xl border border-orange-400/25 bg-[#16161F]">
    {p.image_url && <img src={imgUrl(p.image_url)} alt="" className="h-40 w-full object-cover" />}
    <div className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300">{p.business}</p>
      <h3 className="mt-0.5 font-display text-lg font-bold leading-snug">{p.title}</h3>
      {p.description && <p className="mt-1 text-sm text-zinc-300">{p.description}</p>}
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-500">
        {p.zone && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.zone}</span>}
        {p.valid_until && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />fino al {new Date(p.valid_until).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>}
        {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-orange-300"><ExternalLink className="h-3 w-3" />Apri</a>}
      </div>
    </div>
  </li>
);

export default function Promos() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["promos"], queryFn: async () => (await api.get("/promos")).data });
  return (
    <div data-testid="promos-page" className="px-5 pt-6">
      <button data-testid="promos-back-button" onClick={() => nav("/info")} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Info</button>
      <h1 className="font-display text-3xl font-black tracking-tight">🔥 Promozioni <span className="text-gradient-warm">& Volantini</span></h1>
      <p className="mt-1 text-sm text-zinc-400">Offerte e sconti delle attività di Potenza e provincia.</p>
      <button data-testid="promo-add-button" onClick={() => (user ? setOpen(true) : askLogin())} className="mt-4 inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-100"><Plus className="h-4 w-4" /> Proponi una promozione</button>
      {isLoading && <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-orange-400" />}
      {data?.length === 0 && <p data-testid="promos-empty" className="mt-6 rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">Nessuna promozione attiva al momento.</p>}
      <ul data-testid="promos-list" className="mt-5 flex flex-col gap-4">{data?.map((p) => <PromoCard key={p.id} p={p} />)}</ul>
      <Sheet open={open} onOpenChange={setOpen} testId="promo-sheet" title="Nuova promozione 🔥" subtitle="Volantini, sconti e offerte"><PromoForm onDone={() => setOpen(false)} /></Sheet>
    </div>
  );
}
