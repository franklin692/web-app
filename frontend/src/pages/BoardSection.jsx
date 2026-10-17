import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { DynIcon } from "@/lib/icons";
import { askLogin } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";
import { PostCard, PartnerBadge } from "@/components/board/PostCard";
import { ReplySheet, ReportSheet } from "@/components/board/ReplySheets";
import { BannerSlot } from "@/components/Banner";

export default function BoardSection() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const focus = params.get("p");
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [report, setReport] = useState(null);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const key = ["board", slug, tag, dq];
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/board/${slug}`, { params: { tag, q: dq } })).data });
  const s = data?.section;
  const needUser = (fn) => (user ? fn() : askLogin());

  const react = async (id, type) => {
    try {
      const p = (await api.post(`/posts/${id}/react`, { type })).data;
      qc.setQueryData(key, (old) => ({ ...old, posts: old.posts.map((x) => (x.id === id ? p : x)) }));
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const save = async (id) => {
    try {
      const p = (await api.post(`/posts/${id}/save`)).data;
      qc.setQueryData(key, (old) => ({ ...old, posts: old.posts.map((x) => (x.id === id ? { ...x, saved: p.saved } : x)) }));
      qc.invalidateQueries({ queryKey: ["saved-posts"] });
      toast.success(p.saved ? "Salvato ⭐" : "Rimosso dai salvati");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const posts = focus && data ? [...data.posts].sort((a, b) => (b.id === focus) - (a.id === focus)) : data?.posts;

  if (isError) return <p data-testid="section-not-found" className="px-5 pt-16 text-center text-zinc-400">Sezione non disponibile.</p>;
  return (
    <div data-testid="board-section-page" className="px-5 pt-6">
      <button data-testid="board-back-button" onClick={() => nav("/bacheca")} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Bacheca</button>
      {s && (
        <>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: s.color }}><DynIcon name={s.icon} className="h-6 w-6 text-white" /></span>
            <div className="min-w-0"><h1 data-testid="section-title" className="font-display text-2xl font-black tracking-tight">{s.name}</h1><p className="text-xs text-zinc-400">{s.description}</p></div>
          </div>
          <div className="mt-3"><PartnerBadge s={s} /></div>
          <BannerSlot position={`section:${slug}`} className="mt-4" />
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input data-testid="board-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cerca in ${s.name}…`} className="w-full rounded-2xl border border-white/10 bg-[#16161F] py-3 pl-11 pr-4 text-[15px] text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none" />
          </div>
          {s.tags.length > 0 && (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
              {["", ...s.tags].map((t) => (
                <button key={t || "all"} data-testid={`board-tag-${t || "all"}`} onClick={() => setTag(t)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold ${tag === t ? "border-pink-400 bg-pink-500/20 text-white" : "border-white/10 text-zinc-400"}`}>{t || "Tutti"}</button>
              ))}
            </div>
          )}
        </>
      )}
      <div data-testid="posts-list" className="mt-5 flex flex-col gap-4">
        {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-pink-400" />}
        {posts?.length === 0 && <p data-testid="posts-empty" className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">Nessun annuncio qui… per ora 👀</p>}
        {posts?.map((p, i) => (
          <PostCard key={p.id} p={p} section={s} index={i} highlight={p.id === focus} onReact={react} onSave={save}
            onReply={(x) => needUser(() => setReplyTo(x))} onReport={(x) => setReport({ type: "post", id: x.id, title: x.title })} />
        ))}
      </div>
      <ReplySheet post={replyTo} label={s?.reply_label} onClose={() => setReplyTo(null)} />
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </div>
  );
}
