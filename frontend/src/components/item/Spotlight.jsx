import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { sinceLabel } from "@/lib/calendar";
import { useAuth } from "@/context/AuthContext";
import { Toggle } from "@/components/admin/ui";
import { inputCls } from "@/components/forms/Field";

const Person = ({ p, onWave }) => (
  <li data-testid={`spotlight-person-${p.username}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#16161F] p-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500 font-display font-black text-white">{p.username[0]?.toUpperCase()}</span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">@{p.username}{p.me && <span className="ml-1 text-[10px] text-violet-300">(tu)</span>}</p>
      <p className="truncate text-xs text-zinc-400">{p.status || "È qui adesso"} · <span className="text-zinc-500">qui {sinceLabel(p.since)}</span></p>
    </div>
    {!p.me && (
      <button data-testid={`spotlight-wave-${p.username}`} disabled={p.waved} onClick={() => onWave(p)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${p.waved ? "border border-emerald-400/30 text-emerald-300" : "bg-gradient-to-r from-pink-600 to-orange-500 text-white"}`}>
        {p.waved ? "Saluto inviato ✓" : "Invia Saluto 👋"}
      </button>
    )}
  </li>
);

export const Spotlight = ({ item }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const key = ["spotlight", item.id, item.my_vote];
  const { data } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/items/${item.id}/spotlight`)).data, enabled: !!user });
  const run = async (fn, msg) => {
    try { await fn(); if (msg) toast.success(msg); qc.invalidateQueries({ queryKey: ["spotlight"] }); } catch (e) { toast.error(errMsg(e)); }
  };
  const box = "rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-600/[0.12] to-transparent p-4";
  if (!user) return null;
  const toggle = (on) => (on
    ? run(() => api.post(`/items/${item.id}/spotlight`, { status }), "Sei nello Spotlight per 3 ore ✨")
    : run(() => api.delete(`/items/${item.id}/spotlight`), "Sei uscito dallo Spotlight"));
  return (
    <section data-testid="spotlight-section" className={box}>
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-300" /><h3 className="font-display font-bold">Spotlight ✨ <span className="text-xs font-normal text-zinc-400">chi c'è qui</span></h3></div>
      {data?.can_join || data?.joined ? (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-black/30 p-3">
          {!data.joined && <input data-testid="spotlight-status-input" maxLength={80} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Il tuo stato (es. Al bancone, chi c'è?)" className={`${inputCls} py-2 text-sm`} />}
          <Toggle testId="spotlight-toggle" checked={!!data.joined} onChange={toggle} label={<span className="text-xs">Mostra il mio profilo nello Spotlight di questo posto per 3 ore</span>} />
        </div>
      ) : <p data-testid="spotlight-hint" className="mt-2 text-xs text-zinc-400">Premi «Ci sono ORA 📍» per entrare nello Spotlight e farti salutare.</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {data?.people.map((p) => <Person key={p.id} p={p} onWave={(x) => run(() => api.post(`/spotlight/${x.id}/wave`, {}), `Saluto inviato a @${x.username} 👋`)} />)}
      </ul>
      {data && !data.people.length && <p data-testid="spotlight-empty" className="mt-2 text-xs text-zinc-500">Nessuno nello Spotlight in questo momento.</p>}
    </section>
  );
};
