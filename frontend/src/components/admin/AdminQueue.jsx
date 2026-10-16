import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Pencil, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { adminApi, imgUrl, errMsg } from "@/lib/api";
import { KINDS, tagLabel, timeAgo } from "@/lib/meta";

export const IconBtn = ({ onClick, icon: Icon, label, cls = "", testId }) => (
  <button data-testid={testId} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${cls}`}>
    <Icon className="h-4 w-4" />{label}
  </button>
);

export const useAdminAction = () => {
  const qc = useQueryClient();
  return async (fn, msg) => {
    try {
      await fn();
      if (msg) toast.success(msg);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
};

const Row = ({ entity, d, onEdit }) => {
  const act = useAdminAction();
  const base = entity === "spotted" ? "/admin/spotted" : "/admin/items";
  return (
    <div data-testid={`pending-${entity}-${d.id}`} className="rounded-2xl border border-amber-500/20 bg-[#16161F] p-4">
      <div className="flex gap-3">
        {entity === "item" && <img src={imgUrl(d.image_url)} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{entity === "spotted" ? `Spotted · ${tagLabel(d.tag)}` : KINDS[d.kind]?.label} · {timeAgo(d.created_at)}</p>
          <p className="mt-0.5 font-display font-semibold leading-snug">{entity === "spotted" ? d.where : d.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{entity === "spotted" ? `${d.who ? d.who + " — " : ""}${d.message}` : `${d.zone || ""} ${d.town} ${d.start_date ? "· " + d.start_date + " " + d.start_time : ""}`}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <IconBtn testId={`approve-${d.id}`} icon={Check} label="Approva" cls="border-emerald-400/40 bg-emerald-500/15 text-emerald-200" onClick={() => act(() => adminApi.post(`${base}/${d.id}/status`, { status: "approved" }), "Approvato ✅")} />
        <IconBtn testId={`edit-pending-${d.id}`} icon={Pencil} label="Modifica" cls="border-white/10 bg-white/5 text-zinc-200" onClick={() => onEdit({ mode: "edit", entity, data: d, approve: true })} />
        <IconBtn testId={`reject-${d.id}`} icon={X} label="Rifiuta" cls="border-red-400/30 bg-red-500/10 text-red-200" onClick={() => act(() => adminApi.post(`${base}/${d.id}/status`, { status: "rejected" }), "Rifiutato")} />
        <IconBtn testId={`delete-pending-${d.id}`} icon={Trash2} label="" cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare definitivamente?") && act(() => adminApi.delete(`${base}/${d.id}`), "Eliminato")} />
      </div>
    </div>
  );
};

export const AdminQueue = ({ onEdit }) => {
  const { data } = useQuery({ queryKey: ["admin", "pending"], queryFn: async () => (await adminApi.get("/admin/pending")).data });
  const total = (data?.items.length || 0) + (data?.spotted.length || 0);
  if (data && !total)
    return <div data-testid="queue-empty" className="flex flex-col items-center gap-2 py-16 text-zinc-500"><Inbox className="h-10 w-10" />Coda vuota, tutto approvato!</div>;
  return (
    <div data-testid="admin-queue" className="flex flex-col gap-3">
      {data?.items.map((d) => <Row key={d.id} entity="item" d={d} onEdit={onEdit} />)}
      {data?.spotted.map((d) => <Row key={d.id} entity="spotted" d={d} onEdit={onEdit} />)}
    </div>
  );
};
