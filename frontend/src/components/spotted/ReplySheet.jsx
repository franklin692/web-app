import { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Sheet } from "@/components/Sheet";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";

export const ReplySheet = ({ spotted, onClose }) => {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMessage(""); setContact(""); }, [spotted]);

  const send = async () => {
    if (message.trim().length < 2 || contact.trim().length < 2) return toast.error("Scrivi un messaggio e un contatto");
    setBusy(true);
    try {
      await api.post(`/spotted/${spotted.id}/reply`, { message, contact });
      toast.success("Risposta inviata in privato 💌");
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!spotted} onOpenChange={(o) => !o && onClose()} testId="reply-sheet" title="Rispondi in privato" subtitle={spotted ? `Spotted: ${spotted.where}` : ""}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-100">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" /> La tua risposta non è pubblica: la leggono solo l'autore dello Spotted e gli Admin.
        </div>
        <Field label="Messaggio">
          <textarea data-testid="reply-message-input" rows={4} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sono io! Ero con il cappotto nero…" />
        </Field>
        <Field label="Contatto" hint="Instagram, Telegram o un codice per farti trovare">
          <input data-testid="reply-contact-input" className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@tuo_instagram" />
        </Field>
        <PrimaryButton data-testid="reply-submit-button" onClick={send} disabled={busy}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} Invia in privato
        </PrimaryButton>
      </div>
    </Sheet>
  );
};
