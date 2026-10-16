import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Clock, Ticket, Instagram, Link2, Share2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, imgUrl, errMsg } from "@/lib/api";
import { whenLabel } from "@/lib/meta";
import { shareLink } from "@/lib/share";
import { Sheet } from "@/components/Sheet";
import { KindPill } from "@/components/ItemCard";
import { TrendBadge } from "@/components/TrendBadge";
import { ReportSheet } from "@/components/board/ReplySheets";
import { useConfig, askLogin } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Flag } from "lucide-react";

const Row = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-3 text-sm text-zinc-300">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
    <span>{children}</span>
  </div>
);

const VoteBtn = ({ active, onClick, label, sub, testId, hot }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl border px-3 py-3 text-center transition-all active:scale-95 ${
      active
        ? `border-transparent bg-gradient-to-br ${hot ? "from-orange-500 to-pink-600" : "from-violet-600 to-pink-600"} text-white shadow-[0_0_24px_rgba(236,72,153,0.45)]`
        : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
    }`}
  >
    <span className="text-sm font-bold">{label}</span>
    <span className="text-[10px] opacity-75">{active ? "Tocca per annullare" : sub}</span>
  </button>
);

export const ItemDetailSheet = ({ id, onClose }) => {
  const qc = useQueryClient();
  const cfg = useConfig();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const { data: it, isLoading, isError } = useQuery({ queryKey: ["item", id], queryFn: async () => (await api.get(`/items/${id}`)).data, enabled: !!id });
  const refresh = (data) => {
    qc.setQueryData(["item", id], data);
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["vivi"] });
    qc.invalidateQueries({ queryKey: ["saved"] });
  };
  const vote = useMutation({ mutationFn: async (type) => (await api.post(`/items/${id}/vote`, { type })).data, onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const save = useMutation({
    mutationFn: async () => (await api.post(`/items/${id}/save`)).data,
    onSuccess: (d) => { refresh(d); toast.success(d.saved ? "Salvato nei preferiti ⭐" : "Rimosso dai salvati"); },
  });

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()} testId="item-detail-sheet">
      {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>}
      {isError && <p data-testid="item-not-found" className="py-12 text-center text-zinc-400">Questo contenuto non è più disponibile.</p>}
      {it && (
        <div className="flex flex-col gap-5">
          <div className="relative -mx-5 -mt-4 h-56 overflow-hidden">
            <img src={imgUrl(it.image_url)} alt={it.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111118] to-transparent" />
            <div className="absolute bottom-3 left-5 flex gap-2"><KindPill kind={it.kind} />{it.live && <span className="live-dot rounded-full bg-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-200">● IN CORSO</span>}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{it.category}</p>
            <h2 data-testid="item-detail-title" className="mt-1 font-display text-2xl font-bold leading-tight">{it.title}</h2>
            <div className="mt-3 min-h-[28px]" data-testid="item-detail-trend">
              {it.level > 0 ? <TrendBadge level={it.level} count={it.display_count} size="lg" /> : <span className="text-xs text-zinc-500">Ancora nessuna presenza: sii il primo!</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <VoteBtn testId="vote-going-button" active={it.my_vote === "going"} onClick={() => vote.mutate("going")} label={cfg?.texts.going_label} sub="Vale fino a fine serata" />
            <VoteBtn testId="vote-here-button" hot active={it.my_vote === "here"} onClick={() => vote.mutate("here")} label={cfg?.texts.here_label} sub="Vale per 4 ore" />
          </div>
          <div className="flex gap-3">
            <button data-testid="save-item-button" onClick={() => save.mutate()} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${it.saved ? "border-amber-400/40 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"}`}>
              <Star className={`h-4 w-4 ${it.saved ? "fill-amber-300 text-amber-300" : ""}`} /> {it.saved ? "Salvato" : "Segui / Salva"}
            </button>
            <button data-testid="share-item-button" onClick={() => shareLink(`/item/${it.id}`, it.title, `${it.title} – su Cosa Fare a Potenza`)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/10">
              <Share2 className="h-4 w-4" /> Condividi
            </button>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#16161F] p-4">
            {whenLabel(it) && <Row icon={CalendarDays}>{whenLabel(it)}{it.end_time ? ` → ${it.end_time}` : ""}</Row>}
            <Row icon={MapPin}>{[...new Set([it.address, it.zone, it.town].filter(Boolean))].join(" · ")}</Row>
            {it.opening_hours && <Row icon={Clock}>{it.opening_hours}</Row>}
            {it.price && <Row icon={Ticket}>{it.price}</Row>}
          </div>
          {it.description && <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{it.description}</p>}
          <div className="flex flex-wrap gap-2">
            {it.instagram && <a data-testid="item-instagram-link" href={it.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-xs font-semibold text-pink-200"><Instagram className="h-4 w-4" /> Instagram</a>}
            <button data-testid="report-item-button" onClick={() => (user ? setReport({ type: "item", id: it.id, title: it.title }) : askLogin())} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400"><Flag className="h-4 w-4" /> Segnala</button>
            {it.info_link && <a data-testid="item-info-link" href={it.info_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200"><Link2 className="h-4 w-4" /> Info</a>}
          </div>
        </div>
      )}
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </Sheet>
  );
};
