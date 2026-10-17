import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { LiveRow, openLive } from "@/components/live/LiveRow";

export default function LiveCity() {
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ["live", "city"], queryFn: async () => (await api.get("/live/reports", { params: { limit: 50 } })).data, refetchInterval: 30000 });
  const reports = data?.reports || [];
  return (
    <div data-testid="live-city-page" className="px-5 pt-6">
      <button data-testid="live-city-back-button" onClick={() => nav("/info")} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Info</button>
      <h1 className="font-display text-3xl font-black tracking-tight">📡 Segnalazioni <span className="text-gradient">Live</span></h1>
      <p className="mt-1 text-sm text-zinc-400">Affluenza, traffico, file e situazioni in città nelle ultime 3 ore.</p>
      <button data-testid="live-city-report-button" onClick={() => openLive()} className="mt-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-600 to-orange-500 px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Segnala</button>
      {data && !reports.length && <p data-testid="live-city-empty" className="mt-6 rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">Nessuna segnalazione nelle ultime 3 ore.</p>}
      <ul data-testid="live-city-list" className="mt-5 flex flex-col gap-2">{reports.map((r) => <LiveRow key={r.id} r={r} />)}</ul>
    </div>
  );
}
