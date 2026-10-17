import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Fuel, Info, ExternalLink, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { timeAgo } from "@/lib/meta";
import { DynIcon } from "@/lib/icons";
import { askLogin } from "@/hooks/useConfig";
import { useAuth } from "@/context/AuthContext";
import { inputCls } from "@/components/forms/Field";

const FUELS = [["benzina", "Benzina"], ["diesel", "Diesel"], ["gpl", "GPL"]];
const eur = (v) => (v == null ? "—" : `€ ${Number(v).toFixed(3).replace(".", ",")}`);

const PriceForm = ({ s, fuel, onDone }) => {
  const qc = useQueryClient();
  const [f, setF] = useState(fuel);
  const [v, setV] = useState(s.prices[fuel] ?? "");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await api.post(`/fuel/${s.id}/price`, { fuel: f, price: Number(String(v).replace(",", ".")) });
      toast.success("Prezzo aggiornato, grazie! ⛽");
      qc.invalidateQueries({ queryKey: ["fuel"] });
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-testid={`price-form-${s.id}`} className="fade-up mt-3 flex gap-2">
      <select data-testid="price-fuel-select" value={f} onChange={(e) => { setF(e.target.value); setV(s.prices[e.target.value] ?? ""); }} className={`${inputCls} w-28 py-2 text-sm`}>
        {FUELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <input data-testid="price-value-input" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="1,789" className={`${inputCls} py-2 text-sm`} />
      <button data-testid="price-save-button" onClick={send} disabled={busy} className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 px-3 text-xs font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}</button>
    </div>
  );
};

const Station = ({ s, fuel, best }) => {
  const { user } = useAuth();
  const [edit, setEdit] = useState(false);
  return (
    <li data-testid={`station-${s.id}`} className={`rounded-2xl border p-4 ${best ? "border-emerald-400/50 bg-emerald-500/[0.08] shadow-[0_0_24px_rgba(16,185,129,0.15)]" : "border-white/[0.08] bg-[#16161F]"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {best && <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200"><Trophy className="h-3 w-3" /> Il più conveniente</span>}
          <p className="font-display font-bold leading-tight">{s.name}</p>
          <p className="truncate text-xs text-zinc-400">{s.address}{s.zone ? ` · ${s.zone}` : ""}</p>
        </div>
        <p data-testid={`station-price-${s.id}`} className={`shrink-0 font-display text-xl font-black ${best ? "text-emerald-300" : "text-white"}`}>{eur(s.prices[fuel])}</p>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
        {FUELS.filter(([k]) => k !== fuel).map(([k, l]) => <span key={k}>{l} {eur(s.prices[k])}</span>)}
        <button data-testid={`station-update-${s.id}`} onClick={() => (user ? setEdit(!edit) : askLogin())} className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 font-bold text-zinc-200">Aggiorna prezzo</button>
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">Aggiornato {s.updated_at ? timeAgo(s.updated_at) : "—"}{s.updated_by ? ` da ${s.updated_by}` : ""}</p>
      {edit && <PriceForm s={s} fuel={fuel} onDone={() => setEdit(false)} />}
    </li>
  );
};

const FuelList = () => {
  const [fuel, setFuel] = useState("benzina");
  const { data, isLoading } = useQuery({ queryKey: ["fuel", fuel], queryFn: async () => (await api.get("/fuel", { params: { sort: fuel } })).data });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-2xl bg-[#16161F] p-1">
        {FUELS.map(([k, l]) => <button key={k} data-testid={`fuel-sort-${k}`} onClick={() => setFuel(k)} className={`flex-1 rounded-xl py-2 text-xs font-bold ${fuel === k ? "bg-gradient-to-r from-emerald-500 to-sky-600 text-white" : "text-zinc-400"}`}>{l}</button>)}
      </div>
      <p className="text-[11px] text-zinc-500">Ordinati dal prezzo più basso · prezzi segnalati dalla community, non ufficiali.</p>
      {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-400" />}
      <ul data-testid="fuel-list" className="flex flex-col gap-3">{data?.map((s, i) => <Station key={s.id} s={s} fuel={fuel} best={i === 0 && s.prices[fuel] != null} />)}</ul>
    </div>
  );
};

const InfoList = () => {
  const { data } = useQuery({ queryKey: ["city-info"], queryFn: async () => (await api.get("/info")).data });
  return (
    <ul data-testid="info-list" className="flex flex-col gap-3">
      {data?.map((c) => (
        <li key={c.id} data-testid={`info-card-${c.id}`} className="rounded-2xl border border-white/[0.08] bg-[#16161F] p-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20"><DynIcon name={c.icon} className="h-5 w-5 text-sky-300" /></span><p className="font-display font-bold">{c.title}</p></div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{c.body}</p>
          {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-300"><ExternalLink className="h-3.5 w-3.5" /> Apri</a>}
        </li>
      ))}
    </ul>
  );
};

export default function Utility() {
  const nav = useNavigate();
  const [tab, setTab] = useState("fuel");
  return (
    <div data-testid="utility-page" className="px-5 pt-6">
      <button data-testid="utility-back-button" onClick={() => nav(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400"><ArrowLeft className="h-4 w-4" /> Indietro</button>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Utilità quotidiane</p>
      <h1 className="mt-1 font-display text-4xl font-black tracking-tight">Benzina & <span className="text-gradient">Info Utili</span> ⛽</h1>
      <div className="mt-5 flex gap-2">
        {[["fuel", "Prezzi Benzina", Fuel], ["info", "Info pratiche", Info]].map(([k, l, I]) => (
          <button key={k} data-testid={`utility-tab-${k}`} onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-2.5 text-xs font-bold ${tab === k ? "border-emerald-400/60 bg-emerald-500/15 text-white" : "border-white/10 text-zinc-400"}`}><I className="h-4 w-4" />{l}</button>
        ))}
      </div>
      <div className="mt-5">{tab === "fuel" ? <FuelList /> : <InfoList />}</div>
    </div>
  );
}
