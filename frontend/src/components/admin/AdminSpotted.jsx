import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { STATUS, tagLabel, timeAgo } from "@/lib/meta";
import { IconBtn, useAdminAction } from "@/components/admin/AdminQueue";

export const AdminSpotted = ({ onEdit }) => {
  const act = useAdminAction();
  const [status, setStatus] = useState("approved");
  const { data } = useQuery({ queryKey: ["admin", "spotted", status], queryFn: async () => (await adminApi.get("/admin/spotted", { params: { status } })).data });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {Object.entries(STATUS).map(([s, v]) => (
          <button key={s} data-testid={`admin-spotted-status-${s}`} onClick={() => setStatus(s)} className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold ${status === s ? v.cls : "border-white/10 text-zinc-500"}`}>{v.label}</button>
        ))}
      </div>
      {data?.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Nessuno Spotted.</p>}
      {data?.map((s) => (
        <div key={s.id} data-testid={`admin-spotted-${s.id}`} className="rounded-2xl border border-white/10 bg-[#16161F] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300">{tagLabel(s.tag)} · {timeAgo(s.created_at)} · {s.reply_count} risposte</p>
          <p className="mt-1 font-display font-semibold">{s.where}</p>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{s.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.status !== "approved" && <IconBtn testId={`spotted-approve-${s.id}`} icon={Check} label="Approva" cls="border-emerald-400/40 bg-emerald-500/15 text-emerald-200" onClick={() => act(() => adminApi.post(`/admin/spotted/${s.id}/status`, { status: "approved" }), "Approvato")} />}
            {s.status !== "rejected" && <IconBtn testId={`spotted-reject-${s.id}`} icon={X} label="Nascondi" cls="border-red-400/30 bg-red-500/10 text-red-200" onClick={() => act(() => adminApi.post(`/admin/spotted/${s.id}/status`, { status: "rejected" }), "Rifiutato")} />}
            <IconBtn testId={`spotted-edit-${s.id}`} icon={Pencil} label="" cls="border-white/10 bg-white/5 text-zinc-200" onClick={() => onEdit({ mode: "edit", entity: "spotted", data: s })} />
            <IconBtn testId={`spotted-delete-${s.id}`} icon={Trash2} label="" cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare lo Spotted e le sue risposte?") && act(() => adminApi.delete(`/admin/spotted/${s.id}`), "Eliminato")} />
          </div>
        </div>
      ))}
    </div>
  );
};
