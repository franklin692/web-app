import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { SPOT_TAGS } from "@/lib/meta";
import { SpottedCard } from "@/components/spotted/SpottedCard";
import { ReplySheet } from "@/components/spotted/ReplySheet";
import { CodeSheet } from "@/components/spotted/CodeSheet";

export default function SpottedPage() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const focus = params.get("s");
  const [tag, setTag] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["spotted", tag], queryFn: async () => (await api.get("/spotted", { params: { tag } })).data });

  const react = async (id, type) => {
    try {
      const { data: s } = await api.post(`/spotted/${id}/react`, { type });
      qc.setQueryData(["spotted", tag], (old) => old?.map((x) => (x.id === id ? s : x)));
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const list = focus && data ? [...data].sort((a, b) => (b.id === focus) - (a.id === focus)) : data;

  return (
    <div data-testid="spotted-page" className="px-5 pt-8">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-pink-600/20 blur-3xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">Anonimo · Moderato</p>
      <h1 className="mt-1 font-display text-4xl font-black tracking-tight">Spotted <span className="text-gradient-warm">Potenza</span></h1>
      <p className="mt-2 text-sm text-zinc-400">Hai incrociato qualcuno in città? Ritrovalo qui. Usa il tasto + per inviare il tuo.</p>
      <button data-testid="open-code-sheet-button" onClick={() => setCodeOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10">
        <KeyRound className="h-4 w-4 text-pink-300" /> Leggi risposte con codice
      </button>
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {SPOT_TAGS.map((t) => (
          <button key={t.id || "all"} data-testid={`spotted-filter-${t.id || "all"}`} onClick={() => setTag(t.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${tag === t.id ? "border-pink-400 bg-pink-500/20 text-white" : "border-white/10 text-zinc-400"}`}>{t.label}</button>
        ))}
      </div>
      <div data-testid="spotted-list" className="mt-5 flex flex-col gap-4">
        {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-pink-400" />}
        {list?.length === 0 && <p data-testid="spotted-empty" className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">Nessuno Spotted in questa zona… per ora 👀</p>}
        {list?.map((s, i) => <SpottedCard key={s.id} s={s} index={i} highlight={s.id === focus} onReact={react} onReply={setReplyTo} />)}
      </div>
      <ReplySheet spotted={replyTo} onClose={() => setReplyTo(null)} />
      <CodeSheet open={codeOpen} onOpenChange={setCodeOpen} />
    </div>
  );
}
