import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import { adminApi } from "@/lib/api";
import { DynIcon } from "@/lib/icons";
import { PrimaryButton, inputCls } from "@/components/forms/Field";
import { Card, H, Inp, Toggle, IconBtn, useAdminAction } from "@/components/admin/ui";

const CONF = {
  fuel: {
    title: "Distributori", empty: { name: "", brand: "", address: "", zone: "", prices: { benzina: "", diesel: "", gpl: "" }, hidden: false },
    fields: [["name", "Nome (es. Q8 Gallitello)"], ["brand", "Marchio"], ["address", "Indirizzo"], ["zone", "Zona"]],
    line: (d) => `${d.address} · B ${d.prices.benzina ?? "—"} · D ${d.prices.diesel ?? "—"} · GPL ${d.prices.gpl ?? "—"}`,
  },
  promo: {
    title: "Promozioni & Volantini", empty: { title: "", business: "", description: "", image_url: "", valid_until: "", link: "", zone: "", hidden: false },
    fields: [["title", "Titolo promo"], ["business", "Attività"], ["description", "Descrizione"], ["image_url", "URL immagine / volantino"], ["valid_until", "Valida fino al (AAAA-MM-GG)"], ["zone", "Zona"], ["link", "Link"]],
    line: (d) => `${d.pending ? "⏳ DA APPROVARE (rendi visibile) · " : ""}${d.business} · fino al ${d.valid_until || "—"}`,
  },
  info: {
    title: "Info pratiche città", empty: { title: "", icon: "Info", body: "", link: "", hidden: false },
    fields: [["title", "Titolo (es. Scale Mobili)"], ["icon", "Icona lucide (es. TrainFront, Pill)"], ["link", "Link (facoltativo)"]],
    line: (d) => d.body,
  },
};

const SimpleAdmin = ({ coll }) => {
  const act = useAdminAction();
  const c = CONF[coll];
  const [f, setF] = useState(c.empty);
  const [editId, setEditId] = useState(null);
  const { data } = useQuery({ queryKey: ["admin", "simple", coll], queryFn: async () => (await adminApi.get(`/admin/simple/${coll}`)).data });
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = () => act(async () => {
    if (editId) await adminApi.put(`/admin/simple/${coll}/${editId}`, f); else await adminApi.post(`/admin/simple/${coll}`, f);
    setF(c.empty); setEditId(null);
  }, "Salvato");
  return (
    <div className="flex flex-col gap-3">
      <Card testId={`${coll}-form`}>
        <H>{editId ? `Modifica · ${c.title}` : `Nuovo · ${c.title}`}</H>
        <div className="flex flex-col gap-2">
          {c.fields.map(([k, l]) => <Inp key={k} testId={`${coll}-${k}-input`} placeholder={l} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />)}
          {coll === "fuel" && (
            <div className="grid grid-cols-3 gap-2">
              {["benzina", "diesel", "gpl"].map((x) => <Inp key={x} testId={`fuel-price-${x}-input`} inputMode="decimal" placeholder={x} value={f.prices[x] ?? ""} onChange={(e) => set("prices", { ...f.prices, [x]: e.target.value.replace(",", ".") })} />)}
            </div>
          )}
          {coll === "info" && <textarea data-testid="info-body-input" rows={3} className={inputCls} placeholder="Testo" value={f.body} onChange={(e) => set("body", e.target.value)} />}
          <Toggle checked={!f.hidden} onChange={(v) => set("hidden", !v)} label="Visibile" testId={`${coll}-visible-toggle`} />
          <PrimaryButton data-testid={`${coll}-save-button`} onClick={save}><Plus className="h-4 w-4" /> {editId ? "Salva" : "Aggiungi"}</PrimaryButton>
        </div>
      </Card>
      {data?.map((d) => (
        <Card key={d.id} testId={`${coll}-row-${d.id}`} className={d.hidden ? "opacity-50" : ""}>
          <div className="flex items-start gap-3">
            {coll === "info" && <DynIcon name={d.icon} className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />}
            <div className="min-w-0 flex-1"><p className="font-semibold">{d.name || d.title}</p><p className="line-clamp-2 text-xs text-zinc-400">{c.line(d)}</p></div>
            <IconBtn testId={`${coll}-edit-${d.id}`} icon={Pencil} cls="border-white/10 bg-white/5" onClick={() => { setEditId(d.id); setF(Object.fromEntries(Object.keys(c.empty).map((k) => [k, d[k] ?? c.empty[k]]))); window.scrollTo(0, 0); }} />
            <IconBtn testId={`${coll}-delete-${d.id}`} icon={Trash2} cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare?") && act(() => adminApi.delete(`/admin/simple/${coll}/${d.id}`), "Eliminato")} />
          </div>
        </Card>
      ))}
    </div>
  );
};

export const CityAdmin = () => {
  const [tab, setTab] = useState("fuel");
  return (
    <div data-testid="admin-city" className="flex flex-col gap-3">
      <div className="flex gap-2">
        {[["promo", "🔥 Promo"], ["fuel", "⛽ Distributori"], ["info", "ℹ️ Info pratiche"]].map(([k, l]) => <button key={k} data-testid={`city-tab-${k}`} onClick={() => setTab(k)} className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold ${tab === k ? "border-emerald-400 bg-emerald-500/20" : "border-white/10 text-zinc-500"}`}>{l}</button>)}
      </div>
      <SimpleAdmin key={tab} coll={tab} />
    </div>
  );
};
