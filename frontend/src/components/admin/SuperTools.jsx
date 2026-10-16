import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Pencil, Download, Upload, Shield, Ban, KeyRound } from "lucide-react";
import { adminApi } from "@/lib/api";
import { timeAgo } from "@/lib/meta";
import { useSections } from "@/hooks/useConfig";
import { PrimaryButton, Select } from "@/components/forms/Field";
import { ImageInput } from "@/components/forms/ImageInput";
import { BannerCard } from "@/components/Banner";
import { Card, H, Inp, Toggle, IconBtn, useAdminAction } from "@/components/admin/ui";

const EMPTY_B = { image_url: "", title: "", text: "", cta: "Scopri", link: "", position: "home_top", every_n: 5, start: "", end: "", active: true, priority: 0 };

export const AdminBanners = () => {
  const act = useAdminAction();
  const secs = useSections();
  const [f, setF] = useState(EMPTY_B);
  const [editId, setEditId] = useState(null);
  const { data } = useQuery({ queryKey: ["admin", "banners"], queryFn: async () => (await adminApi.get("/admin/banners")).data });
  const positions = ["home_top", "home_mid", "board", "list", ...Object.keys(secs).map((s) => `section:${s}`)];
  const set = (k) => (v) => setF({ ...f, [k]: v?.target ? v.target.value : v });
  const save = () => act(async () => {
    if (editId) await adminApi.put(`/admin/banners/${editId}`, f); else await adminApi.post("/admin/banners", f);
    setF(EMPTY_B); setEditId(null);
  }, "Banner salvato");
  return (
    <div className="flex flex-col gap-4">
      <Card testId="banner-form">
        <H>{editId ? "Modifica banner" : "Nuovo banner"}</H>
        <div className="flex flex-col gap-2">
          <ImageInput value={f.image_url} onChange={set("image_url")} label="Immagine" />
          <Inp testId="banner-title-input" placeholder="Titolo" value={f.title} onChange={set("title")} />
          <Inp testId="banner-text-input" placeholder="Testo" value={f.text} onChange={set("text")} />
          <div className="flex gap-2"><Inp testId="banner-cta-input" placeholder="Pulsante" value={f.cta} onChange={set("cta")} /><Inp testId="banner-link-input" placeholder="Link (wa.me, instagram, tel:…)" value={f.link} onChange={set("link")} /></div>
          <label className="text-xs text-zinc-400">Posizione<Select testId="banner-position-select" value={f.position} onChange={set("position")} options={positions} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-zinc-400">Ogni N card (lista)<Inp type="number" value={f.every_n} onChange={(e) => set("every_n")(Number(e.target.value))} /></label>
            <label className="text-xs text-zinc-400">Priorità<Inp testId="banner-priority-input" type="number" value={f.priority} onChange={(e) => set("priority")(Number(e.target.value))} /></label>
            <label className="text-xs text-zinc-400">Dal<Inp type="date" value={f.start} onChange={set("start")} /></label>
            <label className="text-xs text-zinc-400">Al<Inp type="date" value={f.end} onChange={set("end")} /></label>
          </div>
          <Toggle testId="banner-active-toggle" checked={f.active} onChange={set("active")} label="Attivo" />
          {(f.title || f.image_url) && <><H>Anteprima</H><BannerCard b={{ ...f, id: "preview" }} /></>}
          <PrimaryButton data-testid="banner-save-button" onClick={save}>{editId ? "Salva banner" : "Crea banner"}</PrimaryButton>
        </div>
      </Card>
      {data?.map((b) => (
        <Card key={b.id} testId={`admin-banner-${b.id}`} className={b.active ? "" : "opacity-60"}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{b.position} · priorità {b.priority} {b.start || b.end ? `· ${b.start || "…"} → ${b.end || "…"}` : ""}</p>
          <p className="font-display font-semibold">{b.title}</p>
          <p data-testid={`banner-stats-${b.id}`} className="mt-1 text-xs text-zinc-400">👁 {b.views} visualizzazioni · 👆 {b.clicks} click · CTR {b.views ? ((100 * b.clicks) / b.views).toFixed(1) : 0}%</p>
          <div className="mt-2 flex gap-2">
            <IconBtn testId={`banner-edit-${b.id}`} icon={Pencil} cls="border-white/10 bg-white/5" onClick={() => { setEditId(b.id); setF(Object.fromEntries(Object.keys(EMPTY_B).map((k) => [k, b[k] ?? EMPTY_B[k]]))); window.scrollTo(0, 0); }} />
            <Toggle checked={b.active} onChange={(v) => act(() => adminApi.put(`/admin/banners/${b.id}`, { active: v }))} />
            <IconBtn testId={`banner-delete-${b.id}`} icon={Trash2} cls="ml-auto border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare il banner?") && act(() => adminApi.delete(`/admin/banners/${b.id}`), "Eliminato")} />
          </div>
        </Card>
      ))}
    </div>
  );
};

export const AdminUsers = () => {
  const act = useAdminAction();
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["admin", "users", q], queryFn: async () => (await adminApi.get("/admin/users", { params: { q } })).data });
  const upd = (u, body, msg) => act(() => adminApi.post(`/admin/users/${u.id}`, body), msg);
  return (
    <div className="flex flex-col gap-3">
      <Inp testId="users-search-input" placeholder="Cerca username o email" value={q} onChange={(e) => setQ(e.target.value)} />
      {data?.map((u) => (
        <Card key={u.id} testId={`user-${u.username}`} className={u.blocked ? "border-red-500/30" : ""}>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-semibold">@{u.username} <span className="text-xs font-normal text-zinc-500">{u.email}</span></p>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase">{u.role}{u.blocked ? " · bloccato" : ""}</span>
          </div>
          <p className="text-[11px] text-zinc-500">{u.content_count} contenuti · iscritto {timeAgo(u.created_at)}</p>
          {u.role !== "superadmin" && (
            <div className="mt-2 flex flex-wrap gap-2">
              <IconBtn testId={`user-role-${u.username}`} icon={Shield} label={u.role === "admin" ? "Togli Admin" : "Rendi Admin"} cls="border-violet-400/40 bg-violet-500/10 text-violet-200" onClick={() => upd(u, { role: u.role === "admin" ? "user" : "admin" }, "Ruolo aggiornato")} />
              <IconBtn testId={`user-block-${u.username}`} icon={Ban} label={u.blocked ? "Sblocca" : "Blocca"} cls="border-red-400/30 bg-red-500/10 text-red-200" onClick={() => upd(u, { blocked: !u.blocked }, u.blocked ? "Sbloccato" : "Bloccato")} />
              <IconBtn testId={`user-password-${u.username}`} icon={KeyRound} label="Password" cls="border-white/10 bg-white/5" onClick={() => { const p = window.prompt("Nuova password (min 6 caratteri):"); if (p) upd(u, { password: p }, "Password reimpostata"); }} />
              <IconBtn testId={`user-delete-${u.username}`} icon={Trash2} cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm(`Eliminare @${u.username}?`) && act(() => adminApi.delete(`/admin/users/${u.id}`), "Utente eliminato")} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export const AdminAudit = () => {
  const { data } = useQuery({ queryKey: ["admin", "audit"], queryFn: async () => (await adminApi.get("/admin/audit")).data });
  return (
    <ul data-testid="audit-list" className="flex flex-col gap-1.5">
      {data?.map((a) => <li key={a.id} className="rounded-xl border border-white/5 bg-[#16161F] px-3 py-2 text-xs"><b className="text-violet-300">@{a.user}</b> {a.action} <span className="text-zinc-300">{a.target}</span><span className="float-right text-zinc-500">{timeAgo(a.at)}</span></li>)}
    </ul>
  );
};

export const AdminStats = () => {
  const { data: s } = useQuery({ queryKey: ["admin", "stats"], queryFn: async () => (await adminApi.get("/admin/stats")).data });
  if (!s) return null;
  const tiles = [["Esplora attivi", s.items_active], ["Annunci attivi", s.posts_active], ["Nuovi utenti 7g", s.new_users_7d], ["Voti attivi", s.votes_active], ["In attesa", s.pending], ["Segnalazioni", s.reports_open]];
  return (
    <div data-testid="admin-stats" className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">{tiles.map(([l, v]) => <Card key={l} className="p-3 text-center"><p className="font-display text-2xl font-black text-gradient">{v}</p><p className="text-[10px] text-zinc-400">{l}</p></Card>)}</div>
      <Card><H>Annunci per sezione</H>{Object.entries(s.per_section).map(([k, v]) => <p key={k} className="flex justify-between text-sm"><span>{k}</span><b>{v}</b></p>)}</Card>
    </div>
  );
};

export const AdminBackup = () => {
  const act = useAdminAction();
  const ref = useRef(null);
  const exportAll = () => act(async () => {
    const r = await adminApi.get("/admin/backup", { responseType: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(r.data);
    a.download = `backup-cosafare-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }, "Backup scaricato");
  const restore = (file) => {
    if (!file || !window.confirm("Il ripristino SOSTITUISCE tutti i dati attuali. Continuare?")) return;
    const fd = new FormData();
    fd.append("file", file);
    act(() => adminApi.post("/admin/restore", fd), "Dati ripristinati");
  };
  return (
    <div className="flex flex-col gap-4">
      <AdminStats />
      <Card>
        <H>Backup</H>
        <p className="mb-3 text-xs text-zinc-400">Esporta contenuti, Bacheca, utenti (senza password) e configurazione in un file JSON.</p>
        <PrimaryButton data-testid="backup-export-button" onClick={exportAll}><Download className="h-5 w-5" /> Esporta tutti i dati</PrimaryButton>
        <button data-testid="backup-restore-button" onClick={() => ref.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 py-3 text-sm font-bold text-red-200"><Upload className="h-5 w-5" /> Ripristina da file</button>
        <input ref={ref} type="file" accept="application/json" hidden data-testid="backup-file-input" onChange={(e) => restore(e.target.files?.[0])} />
      </Card>
    </div>
  );
};
