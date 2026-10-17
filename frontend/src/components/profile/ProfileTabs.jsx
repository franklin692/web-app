import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ChevronRight, Pencil, Trash2, CheckCheck, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { LISTING_STATUS as STATUS, timeAgo, EMPTY_ITEM } from "@/lib/meta";
import { FOLLOW_KINDS } from "@/lib/calendar";
import { Toggle } from "@/components/admin/ui";
import { useAuth } from "@/context/AuthContext";
import { useCats, useSections } from "@/hooks/useConfig";
import { ItemCard } from "@/components/ItemCard";
import { Sheet } from "@/components/Sheet";
import { EntryForm, validateEntry } from "@/components/AddSheet";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";

const Empty = ({ children, testId }) => <p data-testid={testId} className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">{children}</p>;
export const StatusPill = ({ s }) => <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS[s]?.cls || "border-white/10 text-zinc-400"}`}>{STATUS[s]?.label || s}</span>;

export const AdminLink = () => {
  const { isAdmin, isSuper } = useAuth();
  const nav = useNavigate();
  if (!isAdmin) return null;
  return (
    <button data-testid="open-admin-panel-button" onClick={() => nav("/admin")} className="flex w-full items-center gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-pink-500/15 p-4 text-left">
      <ShieldCheck className="h-6 w-6 text-orange-300" />
      <span className="flex-1"><span className="block font-display font-bold">Cabina di Regia</span><span className="text-xs text-zinc-400">{isSuper ? "Super Admin: controllo totale" : "Admin: moderazione e contenuti"}</span></span>
      <ChevronRight className="h-5 w-5 text-zinc-400" />
    </button>
  );
};

const Inbox = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["me", "inbox"], queryFn: async () => (await api.get("/me/inbox")).data });
  useEffect(() => {
    if (data?.some((r) => !r.read)) api.post("/me/inbox/read").then(() => qc.invalidateQueries({ queryKey: ["me", "unread"] }));
  }, [data, qc]);
  if (data?.length === 0) return <Empty testId="inbox-empty">Nessun messaggio. Le risposte ai tuoi annunci arriveranno qui.</Empty>;
  return (
    <ul data-testid="inbox-list" className="flex flex-col gap-3">
      {data?.map((r) => (
        <li key={r.id} data-testid={`inbox-${r.id}`} className={`rounded-2xl border p-4 ${r.read ? "border-white/10 bg-[#16161F]" : "border-pink-500/40 bg-pink-500/10"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{r.kind === "wave" ? <span className="text-violet-300">Saluto 👋 · {r.post_title}</span> : <>Su: <span className="text-pink-300">{r.post_title}</span></>} · {timeAgo(r.created_at)}</p>
          <p className="mt-2 text-sm text-zinc-200">{r.message}</p>
          <p className="mt-2 text-xs"><span className="text-zinc-500">da @{r.from_name}</span>{r.contact && <span className="font-semibold text-pink-300"> · {r.contact}</span>}</p>
        </li>
      ))}
    </ul>
  );
};

const EditListing = ({ l, onClose }) => {
  const qc = useQueryClient();
  const cats = useCats();
  const secs = useSections();
  const [form, setForm] = useState(null);
  const opt = l && (l.type === "item" ? { type: "item", slug: l.kind } : { type: "post", slug: l.kind, section: secs[l.kind] });
  useEffect(() => {
    if (!l) return;
    setForm(l.type === "item" ? Object.fromEntries(Object.keys(EMPTY_ITEM).map((k) => [k, l.item[k] ?? EMPTY_ITEM[k]])) : { data: { ...l.post.data }, tag: l.post.tag });
  }, [l]);
  const save = async () => {
    const err = validateEntry(opt, form, cats);
    if (err) return toast.error(err);
    try {
      if (l.type === "item") await api.put(`/me/items/${l.id}`, { ...form, kind: l.kind });
      else await api.put(`/me/posts/${l.id}`, form);
      toast.success("Modifiche salvate");
      qc.invalidateQueries({ queryKey: ["me"] });
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <Sheet open={!!l} onOpenChange={(o) => !o && onClose()} testId="edit-listing-sheet" title="Modifica annuncio" subtitle="Se la sezione richiede approvazione tornerà in attesa">
      {l && form && (opt.type === "item" || opt.section) && (
        <div className="flex flex-col gap-5"><EntryForm opt={opt} form={form} setForm={setForm} /><PrimaryButton data-testid="edit-listing-save" onClick={save}>Salva</PrimaryButton></div>
      )}
    </Sheet>
  );
};

const MyListings = () => {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(null);
  const { data } = useQuery({ queryKey: ["me", "listings"], queryFn: async () => (await api.get("/me/listings")).data });
  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); qc.invalidateQueries(); } catch (e) { toast.error(errMsg(e)); }
  };
  if (data?.length === 0) return <Empty testId="listings-empty">Non hai ancora pubblicato nulla. Usa il tasto +.</Empty>;
  return (
    <ul data-testid="listings-list" className="flex flex-col gap-2">
      {data?.map((l) => {
        const base = l.type === "item" ? `/me/items/${l.id}` : `/me/posts/${l.id}`;
        return (
          <li key={l.id} data-testid={`listing-${l.id}`} className="rounded-2xl border border-white/10 bg-[#16161F] p-3">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{l.title}</p>
              {l.completed ? <StatusPill s="completato" /> : l.expired ? <StatusPill s="scaduto" /> : <StatusPill s={l.status} />}
            </div>
            {l.status === "rejected" && l.reject_reason && <p data-testid={`listing-reason-${l.id}`} className="mt-1 text-xs text-red-300">Motivo: {l.reject_reason}</p>}
            <div className="mt-2 flex gap-2">
              <button data-testid={`listing-edit-${l.id}`} onClick={() => setEdit(l)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300"><Pencil className="inline h-3 w-3" /> Modifica</button>
              {l.type === "post" && <button data-testid={`listing-complete-${l.id}`} onClick={() => act(() => api.post(`${base}/complete`), l.completed ? "Riattivato" : "Segnato come completato")} className="rounded-lg border border-emerald-400/30 px-2.5 py-1 text-xs text-emerald-300"><CheckCheck className="inline h-3 w-3" /> {l.completed ? "Riattiva" : "Completato"}</button>}
              <button data-testid={`listing-delete-${l.id}`} onClick={() => window.confirm("Eliminare definitivamente?") && act(() => api.delete(base), "Eliminato")} className="ml-auto rounded-lg border border-red-400/30 px-2.5 py-1 text-xs text-red-300"><Trash2 className="inline h-3 w-3" /></button>
            </div>
          </li>
        );
      })}
      <EditListing l={edit} onClose={() => setEdit(null)} />
    </ul>
  );
};

const useSavedItems = () => useQuery({ queryKey: ["saved"], queryFn: async () => (await api.get("/me/saved")).data });

const Followed = () => {
  const nav = useNavigate();
  const { data } = useSavedItems();
  const list = data?.filter((it) => FOLLOW_KINDS.includes(it.kind));
  if (list?.length === 0) return <Empty testId="followed-empty">Non segui ancora nessun locale o luogo. Tocca «Segui 🔔» nella loro scheda.</Empty>;
  return <div data-testid="followed-list" className="flex flex-col gap-3">{list?.map((it, i) => <ItemCard key={it.id} item={it} index={i} onOpen={(id) => nav(`/item/${id}`)} />)}</div>;
};

const Saved = () => {
  const nav = useNavigate();
  const secs = useSections();
  const { data } = useSavedItems();
  const posts = useQuery({ queryKey: ["saved-posts"], queryFn: async () => (await api.get("/me/saved-posts")).data });
  const list = data?.filter((it) => !FOLLOW_KINDS.includes(it.kind));
  if (list?.length === 0 && posts.data?.length === 0) return <Empty testId="saved-empty">Nessun salvato. Tocca «Salva ⭐» su un evento, un corso o un annuncio.</Empty>;
  return (
    <div data-testid="saved-list" className="flex flex-col gap-3">
      {list?.map((it, i) => <ItemCard key={it.id} item={it} index={i} onOpen={(id) => nav(`/item/${id}`)} />)}
      {posts.data?.map((p) => (
        <button key={p.id} data-testid={`saved-post-${p.id}`} onClick={() => nav(`/bacheca/${p.section}?p=${p.id}`)} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#16161F] p-3 text-left">
          <Star className="h-4 w-4 shrink-0 fill-amber-300 text-amber-300" />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.title}</span><span className="text-[11px] text-zinc-500">Bacheca · {secs[p.section]?.name || p.section}</span></span>
        </button>
      ))}
    </div>
  );
};

const NewsletterToggle = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["me", "newsletter"], queryFn: async () => (await api.get("/me/newsletter")).data });
  const set = async (on) => {
    try { await api.put("/me/newsletter", { on }); qc.invalidateQueries({ queryKey: ["me", "newsletter"] }); toast.success(on ? "Iscritto/a alla Newsletter del Weekend 📧" : "Disiscritto/a dalla newsletter"); } catch (e) { toast.error(errMsg(e)); }
  };
  return <Toggle testId="account-newsletter-toggle" checked={!!data?.on} onChange={set} label="Ricevi la Newsletter del Weekend 📧" />;
};

const Account = () => {
  const { user, setUser, logout } = useAuth();
  const [pw, setPw] = useState({ old: "", neu: "" });
  const [em, setEm] = useState({ email: user.email, password: "" });
  const [del, setDel] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const box = "flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#16161F] p-4";
  return (
    <div className="flex flex-col gap-4">
      <div className={box}><p className="font-display font-bold">Newsletter</p><NewsletterToggle /></div>
      <div className={box}>
        <p className="font-display font-bold">Cambia password</p>
        <input data-testid="account-old-password" type="password" placeholder="Password attuale" className={inputCls} value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />
        <input data-testid="account-new-password" type="password" placeholder="Nuova password" className={inputCls} value={pw.neu} onChange={(e) => setPw({ ...pw, neu: e.target.value })} />
        <PrimaryButton data-testid="account-password-save" disabled={busy} onClick={() => run(async () => { await api.put("/me/password", { old_password: pw.old, new_password: pw.neu }); setPw({ old: "", neu: "" }); }, "Password aggiornata")}>Aggiorna password</PrimaryButton>
      </div>
      <div className={box}>
        <p className="font-display font-bold">Cambia email</p>
        <input data-testid="account-email-input" type="email" className={inputCls} value={em.email} onChange={(e) => setEm({ ...em, email: e.target.value })} />
        <input data-testid="account-email-password" type="password" placeholder="Password per confermare" className={inputCls} value={em.password} onChange={(e) => setEm({ ...em, password: e.target.value })} />
        <PrimaryButton data-testid="account-email-save" disabled={busy} onClick={() => run(async () => setUser((await api.put("/me/email", em)).data), "Email aggiornata")}>Aggiorna email</PrimaryButton>
      </div>
      <div className={`${box} border-red-500/30`}>
        <p className="font-display font-bold text-red-300">Elimina account</p>
        <Field label="Password per confermare"><input data-testid="account-delete-password" type="password" className={inputCls} value={del} onChange={(e) => setDel(e.target.value)} /></Field>
        <button data-testid="account-delete-button" disabled={busy} onClick={() => window.confirm("Eliminare l'account e i tuoi annunci?") && run(async () => { await api.post("/me/delete", { password: del }); logout(); }, "Account eliminato")} className="rounded-2xl border border-red-500/40 bg-red-500/10 py-3 text-sm font-bold text-red-200">
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Elimina definitivamente"}
        </button>
      </div>
    </div>
  );
};

const TABS = [["inbox", "Messaggi", Inbox], ["followed", "Seguiti 🔔", Followed], ["saved", "Salvati ⭐", Saved], ["listings", "I miei annunci", MyListings], ["account", "Account", Account]];

export const ProfileTabs = () => {
  const [tab, setTab] = useState("inbox");
  const Comp = TABS.find((t) => t[0] === tab)[2];
  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map(([id, l]) => (
          <button key={id} data-testid={`profile-tab-${id}`} onClick={() => setTab(id)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${tab === id ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400"}`}>{l}</button>
        ))}
      </div>
      <Comp />
    </div>
  );
};
