import { useState, useEffect } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Sheet } from "@/components/Sheet";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";

export const openProposal = (area = "altro") => window.dispatchEvent(new CustomEvent("cfp-propose", { detail: { area } }));

export const ProposalCard = ({ area, testId }) => (
  <button data-testid={testId} onClick={() => openProposal(area)}
    className="mt-6 flex w-full items-center gap-3 rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-4 text-left transition-colors hover:bg-amber-400/10 active:scale-[0.99]">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20"><Lightbulb className="h-5 w-5 text-amber-300" /></span>
    <span><span className="block font-display font-bold">💡 Manca una categoria?</span><span className="text-xs text-zinc-400">Proponi una nuova sezione!</span></span>
  </button>
);

export const ProposalSheet = () => {
  const [area, setArea] = useState(null);
  const [f, setF] = useState({ name: "", description: "", contact: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const h = (e) => { setF({ name: "", description: "", contact: "" }); setArea(e.detail?.area || "altro"); };
    window.addEventListener("cfp-propose", h);
    return () => window.removeEventListener("cfp-propose", h);
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async () => {
    if (f.name.trim().length < 2) return toast.error("Dai un nome alla sezione");
    setBusy(true);
    try {
      await api.post("/proposals", { ...f, area });
      toast.success("Proposta inviata, grazie! 💡");
      setArea(null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={!!area} onOpenChange={(o) => !o && setArea(null)} testId="proposal-sheet" title="Proponi una nuova sezione 💡" subtitle="La redazione valuterà la tua idea">
      <div className="flex flex-col gap-4">
        <Field label="Nome della sezione o categoria"><input data-testid="proposal-name-input" maxLength={80} className={inputCls} value={f.name} onChange={set("name")} placeholder="Es. Karaoke, Gaming, Animali…" /></Field>
        <Field label="Cosa dovrebbe contenere?"><textarea data-testid="proposal-description-input" rows={3} maxLength={600} className={inputCls} value={f.description} onChange={set("description")} /></Field>
        <Field label="Contatto (facoltativo)"><input data-testid="proposal-contact-input" maxLength={120} className={inputCls} value={f.contact} onChange={set("contact")} placeholder="Email o @instagram" /></Field>
        <PrimaryButton data-testid="proposal-submit-button" onClick={send} disabled={busy}>{busy && <Loader2 className="h-5 w-5 animate-spin" />} Invia proposta</PrimaryButton>
      </div>
    </Sheet>
  );
};
