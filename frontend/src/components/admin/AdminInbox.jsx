import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Trash2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { timeAgo } from "@/lib/meta";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/forms/Field";
import { Card, H, Inp, IconBtn, useAdminAction } from "@/components/admin/ui";

const KIND = { pubblicita: "Pubblicità", collabora: "Collabora", info: "Info" };

const Row = ({ kind, d, children }) => {
  const act = useAdminAction();
  return (
    <Card testId={`inbox-${kind}-${d.id}`} className={d.status === "done" ? "opacity-50" : ""}>
      {children}
      <p className="mt-1 text-[10px] text-zinc-500">da @{d.by_user} · {timeAgo(d.created_at)}</p>
      <div className="mt-2 flex gap-2">
        <IconBtn testId={`inbox-done-${d.id}`} icon={Check} label={d.status === "done" ? "Riapri" : "Gestita"} cls="border-emerald-400/40 bg-emerald-500/10 text-emerald-200" onClick={() => act(() => adminApi.post(`/admin/inbox/${kind}/${d.id}/done`))} />
        <IconBtn testId={`inbox-delete-${d.id}`} icon={Trash2} cls="ml-auto border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare?") && act(() => adminApi.delete(`/admin/inbox/${kind}/${d.id}`), "Eliminato")} />
      </div>
    </Card>
  );
};

const Newsletter = ({ list }) => {
  const copy = async () => { await navigator.clipboard.writeText(list.map((x) => x.email).join(", ")); toast.success("Email copiate"); };
  const csv = async () => {
    const r = await adminApi.get("/admin/newsletter.csv", { responseType: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(r.data);
    a.download = "newsletter-iscritti.csv";
    a.click();
  };
  return (
    <div className="flex flex-col gap-3">
      <Card><p className="font-display text-2xl font-black text-gradient" data-testid="newsletter-count">{list.length}</p><p className="text-xs text-zinc-400">iscritti alla Newsletter del Weekend</p>
        <div className="mt-3 flex gap-2">
          <IconBtn testId="newsletter-copy-button" icon={Copy} label="Copia email" cls="border-violet-400/40 bg-violet-500/10 text-violet-200" onClick={copy} />
          <IconBtn testId="newsletter-csv-button" icon={Download} label="Esporta CSV" cls="border-white/10 bg-white/5" onClick={csv} />
        </div>
      </Card>
      <ul className="flex flex-col gap-1">{list.map((x) => <li key={x.id} className="flex justify-between rounded-xl border border-white/5 bg-[#16161F] px-3 py-2 text-xs"><span>{x.email}</span><span className="text-zinc-500">{timeAgo(x.created_at)}</span></li>)}</ul>
    </div>
  );
};

const ContactLinks = () => {
  const act = useAdminAction();
  const { data } = useQuery({ queryKey: ["admin", "config"], queryFn: async () => (await adminApi.get("/admin/config")).data });
  const [c, setC] = useState({ email: "", whatsapp: "", instagram: "" });
  useEffect(() => { if (data?.contacts) setC({ email: "", whatsapp: "", instagram: "", ...data.contacts }); }, [data]);
  return (
    <Card testId="contact-links-form">
      <H>Link rapidi Contattaci (vuoti = nascosti)</H>
      <div className="flex flex-col gap-2">
        <Inp testId="contact-link-email" placeholder="Email (es. redazione@…)" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
        <Inp testId="contact-link-whatsapp" placeholder="WhatsApp (es. 393331234567)" value={c.whatsapp} onChange={(e) => setC({ ...c, whatsapp: e.target.value })} />
        <Inp testId="contact-link-instagram" placeholder="Instagram (@account o link)" value={c.instagram} onChange={(e) => setC({ ...c, instagram: e.target.value })} />
        <PrimaryButton data-testid="contact-links-save" onClick={() => act(() => adminApi.put("/admin/config", { contacts: c }), "Link salvati")}>Salva link</PrimaryButton>
      </div>
    </Card>
  );
};

export const AdminInbox = () => {
  const { isSuper } = useAuth();
  const [tab, setTab] = useState("proposals");
  const { data } = useQuery({ queryKey: ["admin", "inbox"], queryFn: async () => (await adminApi.get("/admin/inbox")).data });
  const tabs = [["proposals", "💡 Proposte"], ["contacts", "📩 Contatti"], ["newsletter", "📧 Newsletter"]];
  const list = data?.[tab] || [];
  return (
    <div data-testid="admin-inbox" className="flex flex-col gap-3">
      <div className="flex gap-2">
        {tabs.map(([k, l]) => <button key={k} data-testid={`inbox-tab-${k}`} onClick={() => setTab(k)} className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold ${tab === k ? "border-orange-400 bg-orange-500/20" : "border-white/10 text-zinc-500"}`}>{l} {data && <span className="opacity-60">{data[k].length}</span>}</button>)}
      </div>
      {tab === "newsletter" ? <Newsletter list={list} /> : list.length === 0 ? <p data-testid="inbox-empty" className="py-10 text-center text-sm text-zinc-500">Ancora niente qui.</p> : list.map((d) => (
        <Row key={d.id} kind={tab} d={d}>
          {tab === "proposals" ? (
            <><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Proposta · {d.area}</p><p className="font-display font-semibold">{d.name}</p>{d.description && <p className="text-xs text-zinc-400">{d.description}</p>}{d.contact && <p className="text-xs text-pink-300">{d.contact}</p>}</>
          ) : (
            <><p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">{KIND[d.kind] || d.kind}</p><p className="font-display font-semibold">{d.name}</p><p className="whitespace-pre-line text-xs text-zinc-300">{d.message}</p><p className="mt-1 text-xs text-pink-300">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p></>
          )}
        </Row>
      ))}
      {isSuper && tab === "contacts" && <ContactLinks />}
    </div>
  );
};
