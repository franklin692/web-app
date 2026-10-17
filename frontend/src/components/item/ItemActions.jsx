import { useState } from "react";
import { Bell, Star, Share2, CalendarPlus, Download, ExternalLink } from "lucide-react";
import { shareLink } from "@/lib/share";
import { FOLLOW_KINDS, downloadIcs, googleCalUrl } from "@/lib/calendar";

const btn = "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors";
const idle = "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10";

export const ItemActions = ({ it, onSave }) => {
  const [cal, setCal] = useState(false);
  const follow = FOLLOW_KINDS.includes(it.kind);
  const on = follow ? "border-violet-400/40 bg-violet-500/15 text-violet-100" : "border-amber-400/40 bg-amber-400/15 text-amber-200";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button data-testid="save-item-button" onClick={onSave} className={`${btn} ${it.saved ? on : idle}`}>
          {follow ? <Bell className={`h-4 w-4 ${it.saved ? "fill-violet-300 text-violet-300" : ""}`} /> : <Star className={`h-4 w-4 ${it.saved ? "fill-amber-300 text-amber-300" : ""}`} />}
          {follow ? (it.saved ? "Seguito ✓" : "Segui 🔔") : it.saved ? "Salvato ⭐" : "Salva ⭐"}
        </button>
        <button data-testid="share-item-button" onClick={() => shareLink(`/item/${it.id}`, it.title, `${it.title} – su Cosa Fare a Potenza`)} className={`${btn} ${idle}`}>
          <Share2 className="h-4 w-4" /> Condividi
        </button>
      </div>
      {it.start_iso && (
        <>
          <button data-testid="calendar-button" onClick={() => setCal(!cal)} className={`${btn} ${cal ? "border-pink-400/40 bg-pink-500/10 text-pink-100" : idle}`}><CalendarPlus className="h-4 w-4" /> Aggiungi al Calendario 📅</button>
          {cal && (
            <div data-testid="calendar-options" className="fade-up grid grid-cols-2 gap-2">
              <button data-testid="calendar-ics-button" onClick={() => downloadIcs(it)} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-[#16161F] p-3 text-xs font-semibold text-zinc-200"><Download className="h-4 w-4 text-pink-300" />File calendario<span className="text-[10px] font-normal text-zinc-500">iPhone · Android · PC</span></button>
              <a data-testid="calendar-google-link" href={googleCalUrl(it)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-[#16161F] p-3 text-xs font-semibold text-zinc-200"><ExternalLink className="h-4 w-4 text-sky-300" />Google Calendar<span className="text-[10px] font-normal text-zinc-500">apri il collegamento</span></a>
            </div>
          )}
        </>
      )}
    </div>
  );
};
