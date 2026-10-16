import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { EMPTY_ITEM } from "@/lib/meta";
import { DynIcon } from "@/lib/icons";
import { useConfig } from "@/hooks/useConfig";
import { Sheet } from "@/components/Sheet";
import { ItemFields } from "@/components/forms/ItemFields";
import { PostFields, missingRequired } from "@/components/board/PostFields";
import { PrimaryButton } from "@/components/forms/Field";
import { AiAssistant, AiEntryCard } from "@/components/ai/AiAssistant";

export const usePickOptions = () => {
  const cfg = useConfig();
  return [
    ...(cfg?.categories || []).map((c) => ({ id: `cat:${c.slug}`, type: "item", slug: c.slug, title: c.name, sub: `Esplora · ${c.plural}`, icon: c.icon, color: c.color })),
    ...(cfg?.sections || []).map((s) => ({ id: `sec:${s.slug}`, type: "post", slug: s.slug, title: s.name, sub: "Bacheca", icon: s.icon, color: s.color, section: s })),
  ];
};

export const KindPicker = ({ options, onPick }) => (
  <div className="grid grid-cols-2 gap-3">
    {options.map((o, i) => (
      <button key={o.id} data-testid={`add-kind-${o.id.replace(":", "-")}`} onClick={() => onPick(o)} style={{ animationDelay: `${i * 40}ms` }}
        className="fade-up flex flex-col items-start gap-3 rounded-3xl border border-white/10 bg-[#16161F] p-4 text-left transition-all hover:border-violet-500/40 active:scale-95">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg" style={{ background: o.color }}><DynIcon name={o.icon} className="h-5 w-5 text-white" /></span>
        <span><span className="block font-display text-[15px] font-bold leading-tight text-white">{o.title}</span><span className="text-[11px] text-zinc-400">{o.sub}</span></span>
      </button>
    ))}
  </div>
);

export const EntryForm = ({ opt, form, setForm }) =>
  opt.type === "item"
    ? <ItemFields kind={opt.slug} value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
    : <PostFields section={opt.section} value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />;

export const emptyFor = (opt) => (opt.type === "item" ? { ...EMPTY_ITEM } : { data: {}, tag: "" });

export const validateEntry = (opt, form, cats) => {
  if (opt.type === "post") {
    const m = missingRequired(opt.section, form.data);
    return m ? `Compila il campo: ${m.label}` : null;
  }
  if (form.title.trim().length < 2) return "Inserisci un titolo";
  if (cats[opt.slug]?.dated && !form.start_date) return "Inserisci la data";
  return null;
};

export const AddSheet = ({ open, onOpenChange, prefillThemes = [] }) => {
  const qc = useQueryClient();
  const cfg = useConfig();
  const options = usePickOptions();
  const [opt, setOpt] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [ai, setAi] = useState(false);
  useEffect(() => { if (!open) setTimeout(() => { setOpt(null); setDone(null); setAi(false); }, 300); }, [open]);

  const cats = Object.fromEntries((cfg?.categories || []).map((c) => [c.slug, c]));
  const submit = async () => {
    const err = validateEntry(opt, form, cats);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const { data } = opt.type === "item" ? await api.post("/submissions/item", { ...form, kind: opt.slug }) : await api.post(`/board/${opt.slug}/posts`, form);
      setDone(data.status === "approved" ? cfg.texts.submit_published : cfg.texts.submit_success);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} testId="add-sheet" title={done ? "Inviato!" : opt ? opt.title : ai ? "Crea con Lucy ✨" : "Aggiungi a Potenza"} subtitle={done ? null : opt ? opt.sub : ai ? "Ti aiuto a pubblicare in pochi secondi" : "Cosa vuoi segnalare alla città?"}>
      {done ? (
        <div data-testid="add-success" className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
          <p data-testid="add-success-message" className="text-base text-zinc-200">{done}</p>
          <PrimaryButton data-testid="add-success-close" onClick={() => onOpenChange(false)}>Chiudi</PrimaryButton>
        </div>
      ) : (
        <>
        {ai && (
        <div className={opt ? "hidden" : "flex flex-col gap-3"}>
          <button data-testid="ai-back-button" onClick={() => setAi(false)} className="inline-flex w-fit items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Scegli a mano</button>
          <AiAssistant options={options} onUse={({ opt: o, form: f }) => { setOpt(o); setForm(f); toast.success("Bozza caricata: controlla e invia"); }} />
        </div>
        )}
        {!opt && !ai && (
        <>
        <AiEntryCard onClick={() => setAi(true)} />
        <KindPicker options={options} onPick={(o) => { setOpt(o); setForm(o.type === "item" ? { ...emptyFor(o), themes: prefillThemes } : emptyFor(o)); }} />
        </>
        )}
        {opt && (
        <div className="flex flex-col gap-5">
          <button data-testid="add-back-button" onClick={() => setOpt(null)} className="inline-flex w-fit items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> {ai ? "Torna alla chat con Lucy" : "Cambia tipo"}</button>
          <EntryForm opt={opt} form={form} setForm={setForm} />
          <PrimaryButton data-testid="add-submit-button" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} {opt.type === "post" && !opt.section.requires_approval ? "Pubblica" : "Invia per Approvazione"}
          </PrimaryButton>
        </div>
        )}
        </>
      )}
    </Sheet>
  );
};
