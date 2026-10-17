import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { inputCls } from "@/components/forms/Field";

export const NewsletterBox = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/newsletter", { email });
      setOk(true);
      toast.success("Iscritto/a! Ci sentiamo venerdì 📧");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form data-testid="newsletter-box" onSubmit={send} className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/15 via-pink-600/10 to-transparent p-5">
      <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-violet-300" /><h2 className="font-display text-lg font-bold">Newsletter del Weekend 📧</h2></div>
      <p className="mt-1 text-xs text-zinc-400">Ogni venerdì il meglio del weekend a Potenza, direttamente nella tua email. Niente spam.</p>
      {ok ? <p data-testid="newsletter-success" className="mt-4 text-sm font-semibold text-emerald-300">Fatto! Sei nella lista ✨</p> : (
        <div className="mt-4 flex gap-2">
          <input data-testid="newsletter-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="la-tua@email.it" className={`${inputCls} py-2.5`} />
          <button data-testid="newsletter-submit-button" disabled={busy} className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iscrivimi"}</button>
        </div>
      )}
    </form>
  );
};

export const ExploreFooter = () => (
  <footer data-testid="explore-footer" className="mt-10 flex flex-col gap-4 px-5">
    <NewsletterBox />
    <Link to="/contatti" data-testid="footer-contact-link" className="flex items-center gap-3 rounded-3xl border border-orange-500/25 bg-orange-500/[0.07] p-4 transition-colors hover:bg-orange-500/15">
      <Megaphone className="h-5 w-5 shrink-0 text-orange-300" />
      <span className="flex-1"><span className="block font-display font-bold">Contattaci / Pubblicizza la tua attività</span><span className="text-xs text-zinc-400">Hai un locale o organizzi eventi? Scrivici</span></span>
    </Link>
    <p className="pb-4 text-center text-[11px] text-zinc-600">Cosa Fare a Potenza · fatto in Basilicata con 💜</p>
  </footer>
);
