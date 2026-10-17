import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle, Instagram, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useConfig } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";
import { NewsletterBox } from "@/components/explore/ExploreFooter";

const KINDS = [["pubblicita", "Pubblicizzati"], ["collabora", "Collabora"], ["info", "Info"]];
const igUrl = (v) => (/^https?:/.test(v) ? v : `https://instagram.com/${v.replace(/^@/, "")}`);

const QuickLinks = ({ c }) => {
  const links = [
    c.email && ["email", `mailto:${c.email}`, Mail, "Email", "from-violet-600 to-indigo-600"],
    c.whatsapp && ["whatsapp", `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`, MessageCircle, "WhatsApp", "from-emerald-500 to-teal-600"],
    c.instagram && ["instagram", igUrl(c.instagram), Instagram, "Instagram", "from-pink-500 to-orange-500"],
  ].filter(Boolean);
  if (!links.length) return null;
  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      {links.map(([k, href, I, l, g]) => (
        <a key={k} data-testid={`contact-quick-${k}`} href={href} target="_blank" rel="noreferrer" className={`flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br ${g} py-3 text-xs font-bold text-white active:scale-95`}><I className="h-5 w-5" />{l}</a>
      ))}
    </div>
  );
};

export default function Contact() {
  const nav = useNavigate();
  const cfg = useConfig();
  const { user } = useAuth();
  const [f, setF] = useState({ kind: "pubblicita", name: user?.username || "", email: user?.email || "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async () => {
    setBusy(true);
    try {
      await api.post("/contact", f);
      setSent(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-testid="contact-page" className="px-5 pt-6">
      <button data-testid="contact-back-button" onClick={() => nav(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Indietro</button>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-300">Locali · Organizzatori · Idee</p>
      <h1 className="mt-1 font-display text-4xl font-black leading-[0.95] tracking-tight">Contattaci / <span className="text-gradient-warm">Pubblicizza</span> la tua attività</h1>
      <p className="mt-2 text-sm text-zinc-400">Vuoi far conoscere il tuo locale, collaborare o segnalarci qualcosa? Scrivici: rispondiamo a tutti.</p>
      <QuickLinks c={cfg?.contacts || {}} />
      {sent ? (
        <div data-testid="contact-success" className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" /><p className="text-sm text-zinc-200">Messaggio inviato! Ti risponderemo il prima possibile.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#16161F]/80 p-5">
          <div className="flex rounded-2xl bg-black/40 p-1">
            {KINDS.map(([k, l]) => <button key={k} data-testid={`contact-kind-${k}`} onClick={() => setF({ ...f, kind: k })} className={`flex-1 rounded-xl py-2 text-xs font-bold ${f.kind === k ? "bg-gradient-to-r from-orange-500 to-pink-600 text-white" : "text-zinc-400"}`}>{l}</button>)}
          </div>
          <Field label="Nome o attività"><input data-testid="contact-name-input" className={inputCls} value={f.name} onChange={set("name")} /></Field>
          <Field label="Email"><input data-testid="contact-email-input" type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
          <Field label="Telefono (facoltativo)"><input data-testid="contact-phone-input" className={inputCls} value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Messaggio"><textarea data-testid="contact-message-input" rows={4} className={inputCls} value={f.message} onChange={set("message")} /></Field>
          <PrimaryButton data-testid="contact-submit-button" onClick={send} disabled={busy}>{busy && <Loader2 className="h-5 w-5 animate-spin" />} Invia messaggio</PrimaryButton>
        </div>
      )}
      <div className="mt-6"><NewsletterBox /></div>
    </div>
  );
}
