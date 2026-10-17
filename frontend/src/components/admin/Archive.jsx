import { useQuery } from "@tanstack/react-query";
import { Copy, Trash2, Archive } from "lucide-react";
import { adminApi, imgUrl } from "@/lib/api";
import { useCats } from "@/hooks/useConfig";
import { Card, IconBtn, useAdminAction } from "@/components/admin/ui";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "");

export const AdminArchive = ({ onEdit }) => {
  const act = useAdminAction();
  const cats = useCats();
  const { data } = useQuery({ queryKey: ["admin", "archive"], queryFn: async () => (await adminApi.get("/admin/items", { params: { status: "archived" } })).data });
  return (
    <div data-testid="admin-archive" className="flex flex-col gap-3">
      <p className="text-xs text-zinc-400">Gli eventi finiti spariscono da Esplora, Vivi Potenza, ricerca e classifiche e finiscono qui, senza essere cancellati.</p>
      {data?.length === 0 && <div data-testid="archive-empty" className="flex flex-col items-center gap-2 py-12 text-sm text-zinc-500"><Archive className="h-10 w-10" />Nessun evento archiviato.</div>}
      {data?.map((d) => (
        <Card key={d.id} testId={`archived-${d.id}`}>
          <div className="flex gap-3">
            <img src={imgUrl(d.image_url)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover opacity-70" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{cats[d.kind]?.name || d.kind} · {fmt(d.start_date)}{d.start_time ? ` · ${d.start_time}` : ""}</p>
              <p className="font-display font-semibold leading-snug">{d.title}</p>
              <p className="text-[11px] text-zinc-500">{d.zone || d.town}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <IconBtn testId={`archive-duplicate-${d.id}`} icon={Copy} label="Ripubblica / Duplica con nuova data" cls="border-violet-400/40 bg-violet-500/10 text-violet-200" onClick={() => onEdit({ mode: "new", prefill: d })} />
            <IconBtn testId={`archive-delete-${d.id}`} icon={Trash2} label="Elimina definitivamente" cls="border-red-400/30 bg-red-500/10 text-red-200" onClick={() => window.confirm("Eliminare definitivamente questo evento?") && act(() => adminApi.delete(`/admin/items/${d.id}`), "Eliminato")} />
          </div>
        </Card>
      ))}
    </div>
  );
};
