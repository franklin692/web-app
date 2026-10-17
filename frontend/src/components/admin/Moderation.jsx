import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Pencil, Trash2, Inbox, EyeOff, Ban, Plus } from "lucide-react";
import { adminApi, imgUrl } from "@/lib/api";
import { timeAgo, STATUS } from "@/lib/meta";
import { useCats, useSections } from "@/hooks/useConfig";
import { IconBtn, useAdminAction, askReason, Card } from "@/components/admin/ui";

const ModRow = ({ entity, d, onEdit, pending }) => {
  const act = useAdminAction();
  const cats = useCats();
  const secs = useSections();
  const base = entity === "post" ? "/admin/posts" : "/admin/items";
  const label = entity === "post" ? `Bacheca · ${secs[d.section]?.name || d.section}${d.tag ? ` · ${d.tag}` : ""}` : cats[d.kind]?.name || d.kind;
  const img = entity === "item" ? d.image_url : d.data?.photo;
  return (
    <Card testId={`mod-${entity}-${d.id}`} className={pending ? "border-amber-500/20" : ""}>
      <div className="flex gap-3">
        {img && <img src={imgUrl(img)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{label} · {timeAgo(d.created_at)}{d.owner_name ? ` · @${d.owner_name}` : ""}</p>
          <p className="mt-0.5 font-display font-semibold leading-snug">{d.title}</p>
          {entity === "post" && <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{Object.values(d.data || {}).filter(Boolean).slice(1, 4).join(" · ")}</p>}
          {!pending && <span className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${STATUS[d.status]?.cls}`}>{STATUS[d.status]?.label}{d.reply_count ? ` · ${d.reply_count} risposte` : ""}</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {d.status !== "approved" && <IconBtn testId={`approve-${d.id}`} icon={Check} label="Approva" cls="border-emerald-400/40 bg-emerald-500/15 text-emerald-200" onClick={() => act(() => adminApi.post(`${base}/${d.id}/status`, { status: "approved" }), "Approvato ✅")} />}
        <IconBtn testId={`edit-${d.id}`} icon={Pencil} label={pending ? "Modifica" : ""} cls="border-white/10 bg-white/5 text-zinc-200" onClick={() => onEdit({ mode: "edit", entity, data: d, approve: pending })} />
        {d.status !== "rejected" && <IconBtn testId={`reject-${d.id}`} icon={X} label="Rifiuta" cls="border-red-400/30 bg-red-500/10 text-red-200" onClick={() => { const r = askReason(); if (r !== null) act(() => adminApi.post(`${base}/${d.id}/status`, { status: "rejected", reason: r }), "Rifiutato"); }} />}
        <IconBtn testId={`delete-${d.id}`} icon={Trash2} cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare definitivamente?") && act(() => adminApi.delete(`${base}/${d.id}`), "Eliminato")} />
      </div>
    </Card>
  );
};

export const AdminQueue = ({ onEdit }) => {
  const [f, setF] = useState("all");
  const { data } = useQuery({ queryKey: ["admin", "pending"], queryFn: async () => (await adminApi.get("/admin/pending")).data });
  const items = f === "post" ? [] : data?.items || [];
  const posts = f === "item" ? [] : data?.posts || [];
  return (
    <div data-testid="admin-queue" className="flex flex-col gap-3">
      <div className="flex gap-2">
        {[["all", "Tutto"], ["item", "Esplora"], ["post", "Bacheca"]].map(([k, l]) => (
          <button key={k} data-testid={`queue-filter-${k}`} onClick={() => setF(k)} className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold ${f === k ? "border-violet-400 bg-violet-500/20" : "border-white/10 text-zinc-500"}`}>{l}</button>
        ))}
      </div>
      {data && !items.length && !posts.length && <div data-testid="queue-empty" className="flex flex-col items-center gap-2 py-16 text-zinc-500"><Inbox className="h-10 w-10" />Coda vuota, tutto approvato!</div>}
      {items.map((d) => <ModRow key={d.id} entity="item" d={d} onEdit={onEdit} pending />)}
      {posts.map((d) => <ModRow key={d.id} entity="post" d={d} onEdit={onEdit} pending />)}
    </div>
  );
};

export const AdminPosts = ({ onEdit }) => {
  const secs = useSections();
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("approved");
  const { data } = useQuery({ queryKey: ["admin", "posts", section, status], queryFn: async () => (await adminApi.get("/admin/posts", { params: { section, status } })).data });
  return (
    <div className="flex flex-col gap-3">
      <button data-testid="admin-new-post-button" onClick={() => onEdit({ mode: "new", only: "post" })} className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-500/50 bg-violet-500/10 py-3 text-sm font-bold text-violet-200"><Plus className="h-4 w-4" /> Nuovo annuncio (pubblica subito)</button>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {[["", "Tutte"], ...Object.values(secs).map((s) => [s.slug, s.name])].map(([k, l]) => (
          <button key={k || "all"} data-testid={`admin-section-${k || "all"}`} onClick={() => setSection(k)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${section === k ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400"}`}>{l}</button>
        ))}
      </div>
      <div className="flex gap-2">
        {Object.entries(STATUS).map(([s, v]) => <button key={s} data-testid={`admin-post-status-${s}`} onClick={() => setStatus(s)} className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold ${status === s ? v.cls : "border-white/10 text-zinc-500"}`}>{v.label}</button>)}
      </div>
      {data?.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Nessun annuncio.</p>}
      {data?.map((d) => <ModRow key={d.id} entity="post" d={d} onEdit={onEdit} />)}
    </div>
  );
};

export const AdminReports = () => {
  const act = useAdminAction();
  const { data } = useQuery({ queryKey: ["admin", "reports"], queryFn: async () => (await adminApi.get("/admin/reports")).data });
  if (data?.length === 0) return <p data-testid="reports-empty" className="py-12 text-center text-sm text-zinc-500">Nessuna segnalazione aperta 🎉</p>;
  const a = (r, action, msg) => act(() => adminApi.post(`/admin/reports/${r.id}/action`, { action }), msg);
  return (
    <div className="flex flex-col gap-3">
      {data?.map((r) => (
        <Card key={r.id} testId={`report-${r.id}`} className="border-red-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-300">{r.target_type === "post" ? "Annuncio Bacheca" : "Esplora"} · da @{r.by_user} · {timeAgo(r.created_at)}</p>
          <p className="mt-1 font-display font-semibold">{r.title}</p>
          {r.reason && <p className="mt-1 text-xs text-zinc-400">“{r.reason}”</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <IconBtn testId={`report-hide-${r.id}`} icon={EyeOff} label="Nascondi" cls="border-amber-400/40 bg-amber-500/10 text-amber-200" onClick={() => a(r, "hide", "Contenuto nascosto")} />
            <IconBtn testId={`report-block-${r.id}`} icon={Ban} label="Blocca autore" cls="border-red-400/40 bg-red-500/10 text-red-200" onClick={() => window.confirm("Nascondere il contenuto e bloccare l'autore?") && a(r, "block", "Autore bloccato")} />
            <IconBtn testId={`report-resolve-${r.id}`} icon={Check} label="Risolta" cls="border-emerald-400/40 bg-emerald-500/10 text-emerald-200" onClick={() => a(r, "resolve", "Segnalazione risolta")} />
            <IconBtn testId={`report-ignore-${r.id}`} icon={X} label="Ignora" cls="border-white/10 bg-white/5 text-zinc-300" onClick={() => a(r, "ignore", "Segnalazione ignorata")} />
          </div>
        </Card>
      ))}
    </div>
  );
};
