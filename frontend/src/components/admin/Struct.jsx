import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Plus, ChevronDown, EyeOff } from "lucide-react";
import { adminApi } from "@/lib/api";
import { DynIcon } from "@/lib/icons";
import { Select } from "@/components/forms/Field";
import { ImageInput } from "@/components/forms/ImageInput";
import { Card, H, Inp, Toggle, Move, move, ColorInput, IconPicker, ChipsInput, useAdminAction } from "@/components/admin/ui";

const TYPES = { text: "Testo breve", textarea: "Testo lungo", number: "Numero", price: "Prezzo", date: "Data", time: "Ora", select: "Scelta da elenco", place: "Zona / Paese", photo: "Foto", link: "Link" };

const FieldsEditor = ({ fields, onChange }) => {
  const up = (i, p) => onChange(fields.map((f, j) => (j === i ? { ...f, ...p } : f)));
  return (
    <div className="flex flex-col gap-2">
      {fields.map((f, i) => (
        <div key={i} data-testid={`field-row-${i}`} className="rounded-xl border border-white/10 bg-black/30 p-2">
          <div className="flex items-center gap-2">
            <Move testId={`field-move-${i}`} onUp={() => onChange(move(fields, i, -1))} onDown={() => onChange(move(fields, i, 1))} />
            <Inp testId={`field-label-${i}`} value={f.label} onChange={(e) => up(i, { label: e.target.value })} placeholder="Nome campo" />
            <button type="button" data-testid={`field-remove-${i}`} onClick={() => onChange(fields.filter((_, j) => j !== i))} className="text-zinc-500"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex items-center gap-3 pl-6">
            <select data-testid={`field-type-${i}`} value={f.type} onChange={(e) => up(i, { type: e.target.value })} className="rounded-lg border border-white/10 bg-[#0B0B0F] px-2 py-1.5 text-xs">
              {Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <Toggle testId={`field-required-${i}`} checked={f.required} onChange={(v) => up(i, { required: v })} label={<span className="text-xs">Obbligatorio</span>} />
          </div>
          {f.type === "select" && <div className="mt-2 pl-6"><ChipsInput testId={`field-options-${i}`} value={f.options} onChange={(v) => up(i, { options: v })} placeholder="Aggiungi opzione" /></div>}
        </div>
      ))}
      <button type="button" data-testid="field-add" onClick={() => onChange([...fields, { key: "", label: "Nuovo campo", type: "text", required: false, options: [] }])} className="rounded-xl border border-dashed border-white/20 py-2 text-xs font-bold text-zinc-300">+ Aggiungi campo</button>
    </div>
  );
};

const StructForm = ({ coll, d, onChange }) => {
  const set = (k) => (v) => onChange({ ...d, [k]: v?.target ? v.target.value : v });
  const isSec = coll === "sections";
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
      <Inp testId="struct-name-input" value={d.name} onChange={set("name")} placeholder="Nome" />
      {!isSec && <Inp testId="struct-plural-input" value={d.plural} onChange={set("plural")} placeholder="Nome al plurale (filtri)" />}
      {isSec && <Inp testId="struct-desc-input" value={d.description} onChange={set("description")} placeholder="Breve descrizione" />}
      <ColorInput testId="struct-color-input" value={d.color} onChange={set("color")} />
      <H>Icona</H><IconPicker testId="struct-icon-picker" value={d.icon} onChange={set("icon")} />
      {!isSec && (
        <>
          <Toggle testId="struct-dated-toggle" checked={d.dated} onChange={set("dated")} label="Con data e orari (sparisce quando è passato)" />
          <H>Sottocategorie</H><ChipsInput testId="struct-subcats-input" value={d.subcategories} onChange={set("subcategories")} placeholder="Aggiungi sottocategoria" />
        </>
      )}
      {isSec && (
        <>
          <H>Campi del modulo</H><FieldsEditor fields={d.fields} onChange={set("fields")} />
          <H>Etichette / filtri</H><ChipsInput testId="struct-tags-input" value={d.tags} onChange={set("tags")} placeholder="Es. Palestra X" />
          <Inp testId="struct-reply-input" value={d.reply_label} onChange={set("reply_label")} placeholder="Testo pulsante risposta" />
          <Toggle testId="struct-approval-toggle" checked={d.requires_approval} onChange={set("requires_approval")} label="Approvazione obbligatoria" />
          <Toggle testId="struct-reactions-toggle" checked={d.reactions} onChange={set("reactions")} label="Reazioni ❤️ 👀 🔥" />
          <label className="text-xs text-zinc-400">Durata annunci (giorni, 0 = senza scadenza)<Inp testId="struct-days-input" type="number" value={d.duration_days} onChange={(e) => set("duration_days")(Number(e.target.value))} /></label>
          <label className="text-xs text-zinc-400">Scade alla data del campo
            <Select testId="struct-expiry-select" value={d.expiry_field} onChange={set("expiry_field")} options={d.fields.filter((f) => f.type === "date" && f.key).map((f) => f.key)} placeholder="— nessuno —" />
          </label>
          <H>Badge partner</H>
          <Inp testId="struct-partner-input" value={d.partner_name} onChange={set("partner_name")} placeholder="Es. Supreme House Immobiliare" />
          <ImageInput value={d.partner_logo} onChange={set("partner_logo")} label="Logo partner" />
        </>
      )}
    </div>
  );
};

const Row = ({ coll, d, i, list, all }) => {
  const act = useAdminAction();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(d);
  const url = `/admin/struct/${coll}`;
  const reorder = (dir) => act(() => adminApi.post(`${url}/reorder`, { ids: move(list, i, dir).map((x) => x.id) }));
  const del = () => {
    let move_to = "";
    if (d.count) {
      move_to = window.prompt(`Contiene ${d.count} contenuti. Scrivi lo slug di destinazione: ${all.filter((x) => x.slug !== d.slug).map((x) => x.slug).join(", ")}`);
      if (!move_to) return;
    } else if (!window.confirm(`Eliminare "${d.name}"?`)) return;
    act(() => adminApi.delete(`${url}/${d.id}`, { params: { move_to } }), "Eliminato");
  };
  return (
    <Card testId={`struct-${d.slug}`} className={d.hidden ? "opacity-60" : ""}>
      <div className="flex items-center gap-3">
        <Move testId={`struct-move-${d.slug}`} onUp={() => reorder(-1)} onDown={() => reorder(1)} />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: d.color }}><DynIcon name={d.icon} className="h-4 w-4 text-white" /></span>
        <button data-testid={`struct-open-${d.slug}`} onClick={() => { setDraft(d); setOpen(!open); }} className="min-w-0 flex-1 text-left">
          <p className="truncate font-semibold">{d.name} {d.hidden && <EyeOff className="inline h-3 w-3" />}</p>
          <p className="text-[11px] text-zinc-500">{d.count} contenuti · {d.slug}</p>
        </button>
        <Toggle testId={`struct-visible-${d.slug}`} checked={!d.hidden} onChange={(v) => act(() => adminApi.put(`${url}/${d.id}`, { hidden: !v }), v ? "Visibile" : "Nascosto")} />
        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <>
          <StructForm coll={coll} d={draft} onChange={setDraft} />
          <div className="mt-3 flex gap-2">
            <button data-testid={`struct-save-${d.slug}`} onClick={() => act(() => adminApi.put(`${url}/${d.id}`, draft), "Salvato")} className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 py-2.5 text-sm font-bold">Salva</button>
            <button data-testid={`struct-delete-${d.slug}`} onClick={del} className="rounded-xl border border-red-400/30 px-4 text-red-300"><Trash2 className="h-4 w-4" /></button>
          </div>
        </>
      )}
    </Card>
  );
};

export const StructAdmin = ({ coll }) => {
  const act = useAdminAction();
  const [name, setName] = useState("");
  const { data } = useQuery({ queryKey: ["admin", "struct", coll], queryFn: async () => (await adminApi.get(`/admin/struct/${coll}`)).data });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Inp testId={`struct-new-name-${coll}`} value={name} onChange={(e) => setName(e.target.value)} placeholder={coll === "sections" ? "Nuova sezione (es. Feste Universitarie)" : "Nuova categoria (es. Sagre in Provincia)"} />
        <button data-testid={`struct-create-${coll}`} onClick={() => name.trim() && act(() => adminApi.post(`/admin/struct/${coll}`, { name }), "Creato").then(() => setName(""))} className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4"><Plus className="h-5 w-5" /></button>
      </div>
      {data?.map((d, i) => <Row key={`${d.id}-${d.order}-${d.hidden}`} coll={coll} d={d} i={i} list={data} all={data} />)}
    </div>
  );
};
