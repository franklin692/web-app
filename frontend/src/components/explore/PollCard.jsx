import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Check } from "lucide-react";
import { toast } from "sonner";
import { api, imgUrl, errMsg } from "@/lib/api";

export const PollCard = ({ title }) => {
  const qc = useQueryClient();
  const { data: p } = useQuery({ queryKey: ["poll"], queryFn: async () => (await api.get("/poll")).data });
  if (!p) return null;
  const vote = async (i) => {
    try {
      qc.setQueryData(["poll"], (await api.post(`/poll/${p.id}/vote`, { option: i })).data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const voted = p.my_vote !== null && p.my_vote !== undefined;
  return (
    <section data-testid="poll-card" className="mx-5 mt-7 overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-600/15 to-pink-600/10">
      {p.image_url && <img src={imgUrl(p.image_url)} alt="" className="h-32 w-full object-cover" />}
      <div className="p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300"><BarChart3 className="h-4 w-4" />{title}</p>
        <h3 className="mt-1 font-display text-lg font-bold">{p.question}</h3>
        <div className="mt-3 flex flex-col gap-2">
          {p.options.map((o, i) =>
            voted ? (
              <div key={i} data-testid={`poll-result-${i}`} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600/60 to-pink-600/60 transition-all duration-700" style={{ width: `${o.pct}%` }} />
                <div className="relative flex items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-1.5">{p.my_vote === i && <Check className="h-4 w-4" />}{o.text}</span><span>{o.pct}%</span>
                </div>
              </div>
            ) : (
              <button key={i} data-testid={`poll-option-${i}`} onClick={() => vote(i)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:border-violet-400 active:scale-[0.98]">{o.text}</button>
            ),
          )}
        </div>
        {voted && <p className="mt-3 text-xs text-zinc-400">{p.comment && <span className="block font-semibold text-pink-200">{p.comment}</span>}{p.total} voti · anonimo</p>}
      </div>
    </section>
  );
};
