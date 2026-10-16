import { MapPin, Clock, Search, Share2, MessageCircleHeart } from "lucide-react";
import { tagLabel, timeAgo } from "@/lib/meta";
import { shareLink } from "@/lib/share";

const REACTS = [
  { id: "heart", emoji: "❤️" },
  { id: "eyes", emoji: "👀" },
  { id: "fire", emoji: "🔥" },
];

const Line = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-pink-300" />
      <p className="text-sm text-zinc-200"><span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>{value}</p>
    </div>
  ) : null;

export const SpottedCard = ({ s, onReact, onReply, highlight, index = 0 }) => (
  <article
    data-testid={`spotted-card-${s.id}`}
    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    className={`fade-up relative overflow-hidden rounded-3xl border bg-[#16161F]/85 p-5 backdrop-blur-md ${highlight ? "border-pink-500/60 shadow-[0_0_30px_rgba(236,72,153,0.25)]" : "border-white/[0.08]"}`}
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl" />
    <div className="mb-4 flex items-center justify-between">
      <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-200">{tagLabel(s.tag)}</span>
      <span className="text-[11px] text-zinc-500">{timeAgo(s.created_at)}</span>
    </div>
    <div className="flex flex-col gap-2">
      <Line icon={MapPin} label="Dove" value={s.where} />
      <Line icon={Clock} label="Quando" value={s.when} />
      <Line icon={Search} label="Chi cerco" value={s.who} />
    </div>
    <p className="mt-4 rounded-2xl bg-black/30 p-4 font-display text-[15px] leading-relaxed text-white">“{s.message}”</p>
    <div className="mt-4 flex items-center gap-2">
      {REACTS.map((r) => {
        const on = s.my_reactions?.includes(r.id);
        return (
          <button key={r.id} data-testid={`spotted-react-${r.id}-${s.id}`} onClick={() => onReact(s.id, r.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all active:scale-90 ${on ? "border-pink-400/60 bg-pink-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <span>{r.emoji}</span><span className="text-xs font-semibold text-zinc-300">{s.reactions?.[r.id] || 0}</span>
          </button>
        );
      })}
      <button data-testid={`spotted-share-${s.id}`} onClick={() => shareLink(`/spotted?s=${s.id}`, "Spotted Potenza", `Spotted: ${s.where}`)} className="ml-auto rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10" aria-label="Condividi">
        <Share2 className="h-4 w-4" />
      </button>
    </div>
    <button data-testid={`spotted-reply-button-${s.id}`} onClick={() => onReply(s)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500/90 to-pink-600 px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]">
      <MessageCircleHeart className="h-4 w-4" /> Sono io / La conosco (Rispondi)
    </button>
  </article>
);
