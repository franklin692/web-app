import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { timeAgo } from "@/lib/meta";
import { askLogin } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";

export const TAG_CLS = {
  pieno: "border-orange-400/40 bg-orange-500/15 text-orange-200",
  parcheggio: "border-sky-400/40 bg-sky-500/15 text-sky-200",
  fila: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  musica: "border-pink-400/40 bg-pink-500/15 text-pink-200",
  avviso: "border-red-400/40 bg-red-500/15 text-red-200",
};

export const useLive = (itemId) =>
  useQuery({ queryKey: ["live", itemId || "all"], queryFn: async () => (await api.get("/live/reports", { params: { item_id: itemId || "", limit: itemId ? 10 : 6 } })).data, refetchInterval: 60000 });

export const openLive = (item) => window.dispatchEvent(new CustomEvent("cfp-live", { detail: { item } }));

export const LiveRow = ({ r }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const confirm = async () => {
    if (!user) return askLogin();
    try {
      await api.post(`/live/reports/${r.id}/confirm`);
      qc.invalidateQueries({ queryKey: ["live"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      toast.success("Confermato, grazie 👍");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <li data-testid={`live-report-${r.id}`} className="fade-up rounded-2xl border border-white/[0.08] bg-[#16161F]/80 p-3">
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${TAG_CLS[r.tag] || TAG_CLS.avviso}`}>{r.tag_label}</span>
        <span data-testid={`live-report-time-${r.id}`} className="ml-auto shrink-0 text-[10px] text-zinc-500">Segnalato {timeAgo(r.created_at)}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{r.item_title || r.zone}{r.item_title && r.zone && <span className="font-normal text-zinc-500"> · {r.zone}</span>}</p>
      {r.note && <p className="mt-0.5 text-xs text-zinc-400">{r.note}</p>}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] text-zinc-500">da @{r.username}</span>
        <button data-testid={`live-confirm-${r.id}`} disabled={r.confirmed || r.mine} onClick={confirm}
          className={`ml-auto rounded-full border px-3 py-1 text-xs font-bold transition-all active:scale-95 ${r.confirmed ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"} disabled:cursor-default`}>
          {r.confirmed ? "Confermato ✓" : "Confermo 👍"}{r.confirms_count > 0 && <span className="ml-1 opacity-70">{r.confirms_count}</span>}
        </button>
      </div>
    </li>
  );
};
