import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Copy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { ADD_OPTIONS, EMPTY_ITEM, EMPTY_SPOTTED } from "@/lib/meta";
import { Sheet } from "@/components/Sheet";
import { ItemFields } from "@/components/forms/ItemFields";
import { SpottedFields } from "@/components/forms/SpottedFields";
import { PrimaryButton } from "@/components/forms/Field";

export const KindPicker = ({ onPick }) => (
  <div className="grid grid-cols-2 gap-3">
    {ADD_OPTIONS.map((o, i) => (
      <button key={o.kind} data-testid={`add-kind-${o.kind}`} onClick={() => onPick(o.kind)} style={{ animationDelay: `${i * 60}ms` }}
        className={`fade-up flex flex-col items-start gap-3 rounded-3xl border border-white/10 bg-[#16161F] p-4 text-left transition-all hover:border-violet-500/40 active:scale-95 ${i === 4 ? "col-span-2 flex-row items-center" : ""}`}>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${o.grad} shadow-lg`}><o.icon className="h-6 w-6 text-white" /></span>
        <span><span className="block font-display text-base font-bold text-white">{o.title}</span><span className="text-xs text-zinc-400">{o.sub}</span></span>
      </button>
    ))}
  </div>
);

export const saveSpottedCode = (code) => {
  const list = JSON.parse(localStorage.getItem("cfp_spotted_codes") || "[]");
  localStorage.setItem("cfp_spotted_codes", JSON.stringify([code, ...list.filter((c) => c !== code)].slice(0, 20)));
};

export const AddSheet = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [kind, setKind] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!open) setTimeout(() => { setKind(null); setDone(null); }, 300);
  }, [open]);

  const pick = (k) => { setKind(k); setForm(k === "spotted" ? EMPTY_SPOTTED : { ...EMPTY_ITEM }); };
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  const submit = async () => {
    if (kind === "spotted" ? form.where.trim().length < 2 || form.message.trim().length < 3 : form.title.trim().length < 2)
      return toast.error(kind === "spotted" ? "Compila almeno Dove e Messaggio" : "Inserisci un titolo");
    if (kind === "event" && !form.start_date) return toast.error("Inserisci la data dell'evento");
    setBusy(true);
    try {
      const { data } = kind === "spotted" ? await api.post("/submissions/spotted", form) : await api.post("/submissions/item", { ...form, kind });
      if (data.code) saveSpottedCode(data.code);
      setDone({ code: data.code });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const opt = ADD_OPTIONS.find((o) => o.kind === kind);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} testId="add-sheet" title={done ? "Inviato!" : kind ? opt.title : "Aggiungi a Potenza"} subtitle={done ? null : kind ? "Verrà pubblicato dopo l'approvazione degli Admin" : "Cosa vuoi segnalare alla città?"}>
      {done ? (
        <div data-testid="add-success" className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
          <p data-testid="add-success-message" className="text-base text-zinc-200">Grazie! Il tuo contributo è stato inviato agli Admin e sarà pubblico appena approvato.</p>
          {done.code && (
            <div className="w-full rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4">
              <p className="text-xs text-pink-200">Il tuo codice segreto per leggere le risposte private (salvato anche su questo dispositivo):</p>
              <button data-testid="spotted-secret-code" onClick={() => { navigator.clipboard?.writeText(done.code); toast.success("Codice copiato"); }} className="mt-2 inline-flex items-center gap-2 font-mono text-2xl font-bold tracking-widest text-white">
                {done.code} <Copy className="h-4 w-4" />
              </button>
            </div>
          )}
          <PrimaryButton data-testid="add-success-close" onClick={() => onOpenChange(false)}>Chiudi</PrimaryButton>
        </div>
      ) : !kind ? (
        <KindPicker onPick={pick} />
      ) : (
        <div className="flex flex-col gap-5">
          <button data-testid="add-back-button" onClick={() => setKind(null)} className="inline-flex w-fit items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Cambia tipo</button>
          {kind === "spotted" ? <SpottedFields value={form} onChange={patch} /> : <ItemFields kind={kind} value={form} onChange={patch} />}
          <PrimaryButton data-testid="add-submit-button" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Invia per Approvazione
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  );
};
