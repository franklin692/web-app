import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Pencil, Trash2, Flame, RotateCcw, Plus } from "lucide-react";
import { adminApi, imgUrl } from "@/lib/api";
import { KINDS, STATUS } from "@/lib/meta";
import { TrendBadge } from "@/components/TrendBadge";
import { IconBtn, useAdminAction } from "@/components/admin/AdminQueue";

const ItemRow = ({ d, onEdit }) => {
  const act = useAdminAction();
  const url = `/admin/items/${d.id}`;
  const boost = (amount) => act(() => adminApi.post(`${url}/boost`, { amount }), amount ? `Boost +${amount} 🔥` : "Boost azzerato");
  return (
    <div data-testid={`admin-item-${d.id}`} className="rounded-2xl border border-white/10 bg-[#16161F] p-4">
      <div className="flex gap-3">
        <img src={imgUrl(d.image_url)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{KINDS[d.kind]?.label}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${STATUS[d.status]?.cls}`}>{STATUS[d.status]?.label}</span>
            {d.expired && <span className="text-[9px] font-bold text-zinc-500">SCADUTO</span>}
          </div>
          <p className="truncate font-display font-semibold">{d.title}</p>
          <p data-testid={`admin-item-score-${d.id}`} className="text-[11px] text-zinc-400">👋 {d.going} · 📍 {d.here} · 🔥 boost {d.boost} = <b className="text-orange-300">{d.score}</b></p>
        </div>
        <button data-testid={`feature-toggle-${d.id}`} onClick={() => act(() => adminApi.post(`${url}/feature`), d.featured ? "Tolto dall'evidenza" : "In Evidenza ⭐")} className={`h-10 w-10 shrink-0 rounded-full border ${d.featured ? "border-amber-400/50 bg-amber-400/20" : "border-white/10 bg-white/5"} flex items-center justify-center`}>
          <Star className={`h-5 w-5 ${d.featured ? "fill-amber-300 text-amber-300" : "text-zinc-500"}`} />
        </button>
      </div>
      {d.level > 0 && <div className="mt-2"><TrendBadge level={d.level} count={d.display_count} /></div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Flame className="h-4 w-4 text-orange-400" />
        {[5, 10, 25].map((n) => <IconBtn key={n} testId={`boost-${n}-${d.id}`} icon={Plus} label={n} cls="border-orange-400/40 bg-orange-500/15 text-orange-200" onClick={() => boost(n)} />)}
        <IconBtn testId={`boost-reset-${d.id}`} icon={RotateCcw} label="" cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => boost(0)} />
        <span className="flex-1" />
        <IconBtn testId={`edit-item-${d.id}`} icon={Pencil} label="" cls="border-white/10 bg-white/5 text-zinc-200" onClick={() => onEdit({ mode: "edit", entity: "item", data: d })} />
        <IconBtn testId={`delete-item-${d.id}`} icon={Trash2} label="" cls="border-red-400/30 bg-red-500/10 text-red-200" onClick={() => window.confirm("Eliminare definitivamente?") && act(() => adminApi.delete(url), "Eliminato")} />
      </div>
    </div>
  );
};

export const AdminManage = ({ onEdit }) => {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("approved");
  const { data } = useQuery({ queryKey: ["admin", "items", kind, status], queryFn: async () => (await adminApi.get("/admin/items", { params: { kind, status } })).data });
  return (
    <div className="flex flex-col gap-3">
      <button data-testid="admin-new-button" onClick={() => onEdit({ mode: "new" })} className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-500/50 bg-violet-500/10 py-3 text-sm font-bold text-violet-200">
        <Plus className="h-4 w-4" /> Inserimento diretto (pubblica subito)
      </button>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {[["", "Tutti"], ...Object.entries(KINDS).map(([k, v]) => [k, v.plural])].map(([k, l]) => (
          <button key={k || "all"} data-testid={`admin-kind-${k || "all"}`} onClick={() => setKind(k)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${kind === k ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400"}`}>{l}</button>
        ))}
      </div>
      <div className="flex gap-2">
        {Object.entries(STATUS).map(([s, v]) => (
          <button key={s} data-testid={`admin-status-${s}`} onClick={() => setStatus(s)} className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold ${status === s ? v.cls : "border-white/10 text-zinc-500"}`}>{v.label}</button>
        ))}
      </div>
      <div data-testid="admin-items-list" className="flex flex-col gap-3">
        {data?.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Nessun elemento.</p>}
        {data?.map((d) => <ItemRow key={d.id} d={d} onEdit={onEdit} />)}
      </div>
    </div>
  );
};
