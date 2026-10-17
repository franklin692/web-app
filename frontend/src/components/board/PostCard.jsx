import { useEffect } from "react";
import { Share2, Star, MessageCircleHeart, Link2, BadgeCheck } from "lucide-react";
import { ReportLink } from "@/components/board/ReplySheets";
import { api, imgUrl } from "@/lib/api";
import { timeAgo } from "@/lib/meta";
import { shareLink } from "@/lib/share";

const REACTS = [{ id: "heart", emoji: "❤️" }, { id: "eyes", emoji: "👀" }, { id: "fire", emoji: "🔥" }];
const fmt = (f, v) => (f.type === "date" ? new Date(v).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }) : v);

export const PartnerBadge = ({ s }) =>
  s.partner_name ? (
    <span data-testid="partner-badge" className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
      {s.partner_logo ? <img src={imgUrl(s.partner_logo)} alt="" className="h-4 w-4 rounded-full object-cover" /> : <BadgeCheck className="h-3.5 w-3.5" />}
      Partner ufficiale · {s.partner_name}
    </span>
  ) : null;

export const PostCard = ({ p, section, onReact, onReply, onReport, onSave, highlight, index = 0 }) => {
  const fields = section.fields.filter((f) => String(p.data[f.key] ?? "").trim());
  const photo = fields.find((f) => f.type === "photo");
  const long = fields.filter((f) => f.type === "textarea");
  const short = fields.filter((f) => !["photo", "textarea"].includes(f.type) && f.key !== "title");
  const msgOnly = section.fields.every((f) => ["textarea", "photo"].includes(f.type));
  const view = () => { const k = `cfp-v-${p.id}`; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); api.post(`/posts/${p.id}/view`).catch(() => {}); } };
  useEffect(() => { if (highlight) view(); }, [highlight]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article data-testid={`post-card-${p.id}`} onClick={view} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`fade-up relative overflow-hidden rounded-3xl border bg-[#16161F]/85 backdrop-blur-md ${highlight ? "border-pink-500/60 shadow-[0_0_30px_rgba(236,72,153,0.25)]" : "border-white/[0.08]"}`}>
      {photo && <img src={imgUrl(p.data[photo.key])} alt="" className="h-44 w-full object-cover" />}
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          {p.tag ? <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: section.color, borderColor: `${section.color}66`, background: `${section.color}1a` }}>{p.tag}</span> : <span />}
          <span className="text-[11px] text-zinc-500">{p.views > 0 && <span data-testid={`post-views-${p.id}`} className="mr-2">👁 {p.views}</span>}{timeAgo(p.created_at)}</span>
        </div>
        {!msgOnly && <h3 className="font-display text-lg font-bold leading-snug">{p.title}</h3>}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {short.map((f) => (
            <div key={f.key} className={f.type === "text" || f.type === "link" ? "col-span-2" : ""}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{f.label}</dt>
              <dd className="text-sm text-zinc-200">{f.type === "link" ? <a href={p.data[f.key]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-300"><Link2 className="h-3 w-3" />Apri link</a> : fmt(f, p.data[f.key])}</dd>
            </div>
          ))}
        </dl>
        {long.map((f) => <p key={f.key} className="mt-3 whitespace-pre-line rounded-2xl bg-black/30 p-4 text-[15px] leading-relaxed text-white">{p.data[f.key]}</p>)}
        <div className="mt-4 flex items-center gap-2">
          {section.reactions && REACTS.map((r) => (
            <button key={r.id} data-testid={`post-react-${r.id}-${p.id}`} onClick={() => onReact(p.id, r.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all active:scale-90 ${p.my_reactions?.includes(r.id) ? "border-pink-400/60 bg-pink-500/20" : "border-white/10 bg-white/5"}`}>
              <span>{r.emoji}</span><span className="text-xs font-semibold text-zinc-300">{p.reactions?.[r.id] || 0}</span>
            </button>
          ))}
          <span className="flex-1" />
          <button data-testid={`post-save-${p.id}`} onClick={() => onSave(p.id)} className={`rounded-full border p-2 ${p.saved ? "border-amber-400/40 bg-amber-400/15 text-amber-300" : "border-white/10 bg-white/5 text-zinc-300"}`} aria-label="Salva"><Star className={`h-4 w-4 ${p.saved ? "fill-amber-300" : ""}`} /></button>
          <button data-testid={`post-share-${p.id}`} onClick={() => shareLink(`/bacheca/${section.slug}?p=${p.id}`, p.title, `${section.name}: ${p.title}`)} className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300" aria-label="Condividi"><Share2 className="h-4 w-4" /></button>
        </div>
        <button data-testid={`post-reply-button-${p.id}`} onClick={() => onReply(p)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          style={{ background: `linear-gradient(90deg, ${section.color}, #EC4899)` }}>
          <MessageCircleHeart className="h-4 w-4" /> {section.reply_label || "Rispondi"}
        </button>
        <div className="mt-3 text-center"><ReportLink testId={`post-report-${p.id}`} onClick={() => onReport(p)} /></div>
      </div>
    </article>
  );
};
