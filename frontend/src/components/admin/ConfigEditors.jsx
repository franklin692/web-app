import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { PrimaryButton, Select } from "@/components/forms/Field";
import { ImageInput } from "@/components/forms/ImageInput";
import { Card, H, Inp, Toggle, Move, move, useAdminAction } from "@/components/admin/ui";

const useAdminConfig = () => {
  const act = useAdminAction();
  const { data } = useQuery({ queryKey: ["admin", "config"], queryFn: async () => (await adminApi.get("/admin/config")).data });
  const [c, setC] = useState(null);
  useEffect(() => { if (data) setC(JSON.parse(JSON.stringify(data))); }, [data]);
  const save = (keys) => act(() => adminApi.put("/admin/config", Object.fromEntries(keys.map((k) => [k, c[k]]))), "Salvato ✅");
  return [c, setC, save];
};

const ListEdit = ({ list, onChange, testId, withArea }) => {
  const [n, setN] = useState("");
  const up = (i, p) => onChange(list.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="flex flex-col gap-2">
      {list.map((x, i) => (
        <div key={i} data-testid={`${testId}-row-${i}`} className={`flex items-center gap-2 ${x.hidden ? "opacity-50" : ""}`}>
          <Move testId={`${testId}-move-${i}`} onUp={() => onChange(move(list, i, -1))} onDown={() => onChange(move(list, i, 1))} />
          <Inp value={x.name} onChange={(e) => up(i, { name: e.target.value })} />
          {withArea && <Inp className="w-28" value={x.area} placeholder="Area" onChange={(e) => up(i, { area: e.target.value })} />}
          <Toggle checked={!x.hidden} onChange={(v) => up(i, { hidden: !v })} />
          <button onClick={() => window.confirm(`Eliminare ${x.name}?`) && onChange(list.filter((_, j) => j !== i))} className="text-zinc-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <Inp testId={`${testId}-new`} value={n} onChange={(e) => setN(e.target.value)} placeholder={withArea ? "Nuovo comune (es. Villa d'Agri)" : "Nuova zona"} />
        <button data-testid={`${testId}-add`} onClick={() => { if (n.trim()) { onChange([...list, { name: n.trim(), hidden: false, ...(withArea ? { area: "" } : {}) }]); setN(""); } }} className="shrink-0 rounded-xl bg-white/10 px-4 font-bold">+</button>
      </div>
    </div>
  );
};

export const ZonesTowns = () => {
  const [c, setC, save] = useAdminConfig();
  if (!c) return null;
  return (
    <div className="flex flex-col gap-4">
      <Card><H>Zone di Potenza</H><ListEdit testId="zones" list={c.zones} onChange={(v) => setC({ ...c, zones: v })} /></Card>
      <Card><H>Comuni e aree</H><ListEdit testId="towns" withArea list={c.towns} onChange={(v) => setC({ ...c, towns: v })} /></Card>
      <PrimaryButton data-testid="zones-save" onClick={() => save(["zones", "towns"])}>Salva zone e paesi</PrimaryButton>
    </div>
  );
};

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export const HomeBuilder = () => {
  const [c, setC, save] = useAdminConfig();
  if (!c) return null;
  const h = c.home;
  const setH = (p) => setC({ ...c, home: { ...h, ...p } });
  const al = h.alert;
  return (
    <div className="flex flex-col gap-4">
      <Card testId="home-preview" className="bg-gradient-to-br from-violet-600/20 to-pink-600/10">
        <H>Anteprima</H>
        <p className="font-display text-3xl font-black leading-none">{h.title}<br /><span className="text-gradient">{h.subtitle}</span></p>
      </Card>
      <Card>
        <H>Titolo Home</H>
        <div className="flex flex-col gap-2">
          <Inp testId="home-title-input" value={h.title} onChange={(e) => setH({ title: e.target.value })} />
          <Inp testId="home-subtitle-input" value={h.subtitle} onChange={(e) => setH({ subtitle: e.target.value })} />
        </div>
        <H>Titoli programmati</H>
        {h.schedules.map((s, i) => (
          <div key={i} data-testid={`schedule-${i}`} className="mb-2 flex flex-col gap-2 rounded-xl border border-white/10 p-2">
            <div className="flex gap-2">
              <select value={s.day} onChange={(e) => setH({ schedules: h.schedules.map((x, j) => (j === i ? { ...x, day: e.target.value, date: "" } : x)) })} className="flex-1 rounded-lg border border-white/10 bg-[#0B0B0F] px-2 text-xs">
                <option value="">— giorno —</option>{DAYS.map((d, k) => <option key={k} value={String(k)}>{d}</option>)}
              </select>
              <Inp type="date" value={s.date} onChange={(e) => setH({ schedules: h.schedules.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} />
              <button onClick={() => setH({ schedules: h.schedules.filter((_, j) => j !== i) })} className="text-zinc-500"><Trash2 className="h-4 w-4" /></button>
            </div>
            <Inp value={s.title} placeholder="Titolo" onChange={(e) => setH({ schedules: h.schedules.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <Inp value={s.subtitle} placeholder="Sottotitolo" onChange={(e) => setH({ schedules: h.schedules.map((x, j) => (j === i ? { ...x, subtitle: e.target.value } : x)) })} />
          </div>
        ))}
        <button data-testid="schedule-add" onClick={() => setH({ schedules: [...h.schedules, { day: "", date: "", title: "", subtitle: "" }] })} className="w-full rounded-xl border border-dashed border-white/20 py-2 text-xs font-bold">+ Titolo programmato</button>
      </Card>
      <Card>
        <H>Barra Avviso Importante</H>
        <div className="flex flex-col gap-2">
          <Toggle testId="alert-active-toggle" checked={al.active} onChange={(v) => setH({ alert: { ...al, active: v } })} label="Attiva" />
          <Inp testId="alert-text-input" value={al.text} placeholder="Testo avviso" onChange={(e) => setH({ alert: { ...al, text: e.target.value } })} />
          <Select testId="alert-level-select" value={al.level} onChange={(v) => setH({ alert: { ...al, level: v } })} options={["info", "warn", "urgent"]} />
          <Inp value={al.link} placeholder="Link (facoltativo)" onChange={(e) => setH({ alert: { ...al, link: e.target.value } })} />
          <div className="flex gap-2"><Inp type="date" value={al.start} onChange={(e) => setH({ alert: { ...al, start: e.target.value } })} /><Inp type="date" value={al.end} onChange={(e) => setH({ alert: { ...al, end: e.target.value } })} /></div>
        </div>
      </Card>
      <Card>
        <H>Blocchi della Home</H>
        {h.blocks.map((b, i) => (
          <div key={b.id} data-testid={`block-${b.id}`} className="mb-2 flex items-center gap-2">
            <Move testId={`block-move-${b.id}`} onUp={() => setH({ blocks: move(h.blocks, i, -1) })} onDown={() => setH({ blocks: move(h.blocks, i, 1) })} />
            <Inp testId={`block-label-${b.id}`} value={b.label} onChange={(e) => setH({ blocks: h.blocks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <Toggle testId={`block-toggle-${b.id}`} checked={b.enabled} onChange={(v) => setH({ blocks: h.blocks.map((x, j) => (j === i ? { ...x, enabled: v } : x)) })} />
          </div>
        ))}
        <H>Filtri temporali</H>
        <div className="flex gap-2">{["tonight", "weekend", "all"].map((k) => <Inp key={k} testId={`time-label-${k}`} value={h.time_labels[k]} onChange={(e) => setH({ time_labels: { ...h.time_labels, [k]: e.target.value } })} />)}</div>
      </Card>
      <PrimaryButton data-testid="home-save" onClick={() => save(["home"])}>Salva Home</PrimaryButton>
    </div>
  );
};

export const TextsRules = () => {
  const [c, setC, save] = useAdminConfig();
  if (!c) return null;
  const t = c.texts, tr = c.trend;
  const setT = (k) => (e) => setC({ ...c, texts: { ...t, [k]: e.target.value } });
  const setTr = (p) => setC({ ...c, trend: { ...tr, ...p } });
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <H>Nome e logo</H>
        <Inp testId="app-name-input" value={c.app_name} onChange={(e) => setC({ ...c, app_name: e.target.value })} />
        <div className="mt-2"><ImageInput value={c.logo_url} onChange={(v) => setC({ ...c, logo_url: v })} label="Logo / icona" /></div>
      </Card>
      <Card>
        <H>Testi principali</H>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-400">Conferma invio (con approvazione)<Inp testId="text-submit-success" value={t.submit_success} onChange={setT("submit_success")} /></label>
          <label className="text-xs text-zinc-400">Conferma pubblicazione immediata<Inp testId="text-submit-published" value={t.submit_published} onChange={setT("submit_published")} /></label>
          <label className="text-xs text-zinc-400">Pulsante "Ci sarò"<Inp testId="text-going" value={t.going_label} onChange={setT("going_label")} /></label>
          <label className="text-xs text-zinc-400">Pulsante "Ci sono ORA"<Inp testId="text-here" value={t.here_label} onChange={setT("here_label")} /></label>
          <label className="text-xs text-zinc-400">Testo schermata Radar<Inp testId="text-radar" value={t.radar_text} onChange={setT("radar_text")} /></label>
        </div>
      </Card>
      <Card>
        <H>Badge di tendenza</H>
        {[["1", "1–5 voti"], ["2", "6–19 voti"], ["3", "20–49 voti"], ["4", "50+ voti"]].map(([k, l]) => (
          <label key={k} className="mb-2 block text-xs text-zinc-400">{l}<Inp testId={`trend-label-${k}`} value={tr.labels[k]} onChange={(e) => setTr({ labels: { ...tr.labels, [k]: e.target.value } })} /></label>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-zinc-400">Soglia numeri<Inp testId="settings-threshold-input" type="number" value={tr.threshold} onChange={(e) => setTr({ threshold: Number(e.target.value) })} /></label>
          <label className="text-xs text-zinc-400">Ci sarò (ore)<Inp testId="going-hours-input" type="number" value={tr.going_hours} onChange={(e) => setTr({ going_hours: Number(e.target.value) })} /></label>
          <label className="text-xs text-zinc-400">Ci sono (ore)<Inp testId="here-hours-input" type="number" value={tr.here_hours} onChange={(e) => setTr({ here_hours: Number(e.target.value) })} /></label>
        </div>
      </Card>
      <PrimaryButton data-testid="texts-save" onClick={() => save(["app_name", "logo_url", "texts", "trend"])}>Salva testi e regole</PrimaryButton>
    </div>
  );
};
