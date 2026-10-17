import { useState, useEffect } from "react";
import { Lock, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Sheet } from "@/components/Sheet";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";

export const ReplySheet = ({ post, label, onClose }) => {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMessage(""); setContact(""); }, [post]);
  const send = async () => {
    if (message.trim().length < 2 || contact.trim().length < 2) return toast.error("Scrivi un messaggio e un contatto");
    setBusy(true);
    try {
      await api.post(`/posts/${post.id}/reply`, { message, contact });
      toast.success("Inviato in privato all'autore 💌");
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const spotted = post?.section === "spotted";
  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()} testId="reply-sheet" title={label || "Rispondi"} subtitle={post?.title}>
      <div className="flex flex-col gap-4">
        <div data-testid="reply-privacy-note" className="flex items-start gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-100">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {spotted ? "La risposta è privata e la vedrà solo l'utente che ha pubblicato lo Spotted." : "La risposta è privata e la vedrà solo l'utente che ha pubblicato l'annuncio."}
        </div>
        <Field label="Messaggio"><textarea data-testid="reply-message-input" rows={4} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Field label="Contatto" hint="Instagram, WhatsApp o telefono"><input data-testid="reply-contact-input" className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@tuo_instagram" /></Field>
        <PrimaryButton data-testid="reply-submit-button" onClick={send} disabled={busy}>{busy && <Loader2 className="h-5 w-5 animate-spin" />} Invia in privato</PrimaryButton>
      </div>
    </Sheet>
  );
};

const REASONS = ["Info errata", "Evento finito o annullato", "Contenuto offensivo", "Spam o truffa", "Altro"];

export const ReportSheet = ({ target, onClose }) => {
  const [pick, setPick] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { setPick(""); setNote(""); }, [target]);
  const send = async () => {
    if (!pick) return toast.error("Scegli un motivo");
    try {
      await api.post("/reports", { target_type: target.type, target_id: target.id, reason: note.trim() ? `${pick}: ${note.trim()}` : pick });
      toast.success("Segnalazione inviata alla redazione. Grazie!");
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()} testId="report-sheet" title="Segnala info errata o abuso" subtitle={target?.title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r} data-testid={`report-reason-${r.split(" ")[0].toLowerCase()}`} onClick={() => setPick(r)}
              className={`rounded-full border px-3 py-2 text-xs font-bold ${pick === r ? "border-red-400/50 bg-red-500/15 text-red-100" : "border-white/10 bg-white/5 text-zinc-300"}`}>{r}</button>
          ))}
        </div>
        <Field label="Dettagli (facoltativi)"><textarea data-testid="report-reason-input" rows={3} maxLength={400} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. l'orario corretto è 22:00" /></Field>
        <PrimaryButton data-testid="report-submit-button" onClick={send}>Invia segnalazione</PrimaryButton>
      </div>
    </Sheet>
  );
};

export const ReportLink = ({ onClick, testId }) => (
  <button data-testid={testId} onClick={onClick} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline">
    <Flag className="h-3 w-3" /> Segnala info errata o abuso
  </button>
);
