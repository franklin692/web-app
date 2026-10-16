import { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
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
  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()} testId="reply-sheet" title={label || "Rispondi"} subtitle={post?.title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-100">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Il messaggio non è pubblico: lo leggono solo l'autore dell'annuncio e gli Admin.
        </div>
        <Field label="Messaggio"><textarea data-testid="reply-message-input" rows={4} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Field label="Contatto" hint="Instagram, WhatsApp o telefono"><input data-testid="reply-contact-input" className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@tuo_instagram" /></Field>
        <PrimaryButton data-testid="reply-submit-button" onClick={send} disabled={busy}>{busy && <Loader2 className="h-5 w-5 animate-spin" />} Invia in privato</PrimaryButton>
      </div>
    </Sheet>
  );
};

export const ReportSheet = ({ target, onClose }) => {
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [target]);
  const send = async () => {
    try {
      await api.post("/reports", { target_type: target.type, target_id: target.id, reason });
      toast.success("Segnalazione inviata agli Admin. Grazie!");
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()} testId="report-sheet" title="Segnala contenuto" subtitle={target?.title}>
      <div className="flex flex-col gap-4">
        <Field label="Motivo"><textarea data-testid="report-reason-input" rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Es. contenuto offensivo, spam, dati personali…" /></Field>
        <PrimaryButton data-testid="report-submit-button" onClick={send}>Invia segnalazione</PrimaryButton>
      </div>
    </Sheet>
  );
};
