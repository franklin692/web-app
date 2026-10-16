import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AdminQueue } from "@/components/admin/AdminQueue";
import { AdminManage } from "@/components/admin/AdminManage";
import { AdminSpotted } from "@/components/admin/AdminSpotted";
import { AdminReplies } from "@/components/admin/AdminReplies";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminEditor } from "@/components/admin/AdminEditor";

const TABS = [["queue", "Coda"], ["manage", "Gestione"], ["spotted", "Spotted"], ["replies", "Risposte"], ["settings", "Impostazioni"]];

export default function Admin() {
  const { isAdmin, verifyAdmin } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("queue");
  const [editing, setEditing] = useState(null);
  useEffect(() => { if (isAdmin) verifyAdmin(); }, [isAdmin, verifyAdmin]);
  const pending = useQuery({ queryKey: ["admin", "pending"], queryFn: async () => (await adminApi.get("/admin/pending")).data, enabled: isAdmin });
  if (!isAdmin) return <Navigate to="/profilo" replace />;
  const count = (pending.data?.items.length || 0) + (pending.data?.spotted.length || 0);

  return (
    <div data-testid="admin-page" className="px-5 pt-6">
      <button data-testid="admin-back-button" onClick={() => nav("/profilo")} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Profilo</button>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600"><ShieldCheck className="h-6 w-6 text-white" /></span>
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Pannello Admin</h1>
          <p className="text-xs text-zinc-400">Controlla tutta la piattaforma</p>
        </div>
      </div>
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map(([id, l]) => (
          <button key={id} data-testid={`admin-tab-${id}`} onClick={() => setTab(id)} className={`relative shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${tab === id ? "border-orange-400 bg-orange-500/20 text-white" : "border-white/10 text-zinc-400"}`}>
            {l}
            {id === "queue" && count > 0 && <span data-testid="pending-count" className="ml-1.5 rounded-full bg-orange-500 px-1.5 text-[10px] text-white">{count}</span>}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "queue" && <AdminQueue onEdit={setEditing} />}
        {tab === "manage" && <AdminManage onEdit={setEditing} />}
        {tab === "spotted" && <AdminSpotted onEdit={setEditing} />}
        {tab === "replies" && <AdminReplies />}
        {tab === "settings" && <AdminSettings />}
      </div>
      <AdminEditor target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
