import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AdminQueue, AdminPosts, AdminReports, AdminReplies } from "@/components/admin/Moderation";
import { AdminManage } from "@/components/admin/AdminManage";
import { AdminPolls } from "@/components/admin/Polls";
import { StructAdmin } from "@/components/admin/Struct";
import { ZonesTowns, HomeBuilder, TextsRules } from "@/components/admin/ConfigEditors";
import { AdminBanners, AdminUsers, AdminAudit, AdminStats, AdminBackup } from "@/components/admin/SuperTools";
import { AdminEditor } from "@/components/admin/AdminEditor";

const TABS = [
  ["queue", "Coda", false], ["reports", "Segnalazioni", false], ["manage", "Esplora", false], ["posts", "Bacheca", false],
  ["polls", "Sondaggi", false], ["replies", "Risposte", false], ["stats", "Statistiche", false],
  ["vivi", "Vivi Potenza", true], ["cats", "Categorie", true], ["sections", "Sezioni Bacheca", true], ["zones", "Zone & Paesi", true], ["home", "Home", true],
  ["banners", "Banner & Sponsor", true], ["texts", "Testi & Regole", true], ["users", "Utenti", true], ["audit", "Registro", true], ["backup", "Backup", true],
];

export default function Admin() {
  const { isAdmin, isSuper, ready } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("queue");
  const [editing, setEditing] = useState(null);
  const pending = useQuery({ queryKey: ["admin", "pending"], queryFn: async () => (await adminApi.get("/admin/pending")).data, enabled: isAdmin });
  if (!ready) return null;
  if (!isAdmin) return <Navigate to="/profilo" replace />;
  const count = (pending.data?.items.length || 0) + (pending.data?.posts.length || 0);
  const tabs = TABS.filter((t) => !t[2] || isSuper);
  const C = {
    queue: <AdminQueue onEdit={setEditing} />, reports: <AdminReports />, manage: <AdminManage onEdit={setEditing} />, posts: <AdminPosts onEdit={setEditing} />,
    polls: <AdminPolls />, replies: <AdminReplies />, stats: <AdminStats />, vivi: <StructAdmin coll="themes" />, cats: <StructAdmin coll="categories" />, sections: <StructAdmin coll="sections" />,
    zones: <ZonesTowns />, home: <HomeBuilder />, banners: <AdminBanners />, texts: <TextsRules />, users: <AdminUsers />, audit: <AdminAudit />, backup: <AdminBackup />,
  };
  return (
    <div data-testid="admin-page" className="px-5 pt-6">
      <button data-testid="admin-back-button" onClick={() => nav("/profilo")} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Profilo</button>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600"><ShieldCheck className="h-6 w-6 text-white" /></span>
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Cabina di Regia</h1>
          <p data-testid="admin-role-label" className="text-xs text-zinc-400">{isSuper ? "Super Admin · controllo totale" : "Admin · moderazione e contenuti"}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map(([id, l, sup]) => (
          <button key={id} data-testid={`admin-tab-${id}`} onClick={() => setTab(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${tab === id ? "border-orange-400 bg-orange-500/20 text-white" : sup ? "border-violet-500/30 text-violet-300" : "border-white/10 text-zinc-400"}`}>
            {l}{id === "queue" && count > 0 && <span data-testid="pending-count" className="ml-1.5 rounded-full bg-orange-500 px-1.5 text-[10px] text-white">{count}</span>}
          </button>
        ))}
      </div>
      <div className="mt-5">{C[tab]}</div>
      <AdminEditor target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
