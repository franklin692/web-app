import { useConfig } from "@/hooks/useConfig";
import { Field, Select, inputCls } from "@/components/forms/Field";
import { ImageInput } from "@/components/forms/ImageInput";

export const ItemFields = ({ kind, value, onChange }) => {
  const set = (k) => (e) => onChange({ [k]: e?.target ? e.target.value : e });
  const cfg = useConfig();
  const cat = cfg?.categories.find((c) => c.slug === kind) || {};
  const isEvent = !!cat.dated;
  return (
    <div className="flex flex-col gap-4">
      <Field label="Titolo *">
        <input data-testid="field-title" className={inputCls} value={value.title} onChange={set("title")} placeholder={isEvent ? "Es. Serata Reggaeton al Centro" : "Es. Birreria del Corso"} />
      </Field>
      <Field label="Categoria">
        <Select testId="field-category" value={value.category} onChange={set("category")} options={cat.subcategories || []} placeholder="Scegli…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Comune">
          <Select testId="field-town" value={value.town} onChange={set("town")} options={(cfg?.towns || []).map((t) => t.name)} />
        </Field>
        <Field label="Zona">
          <input data-testid="field-zone" list="zones-list" className={inputCls} value={value.zone} onChange={set("zone")} placeholder="Es. Centro Storico" />
          <datalist id="zones-list">{(cfg?.zones || []).map((z) => <option key={z} value={z} />)}</datalist>
        </Field>
      </div>
      {isEvent && (
        <>
          <Field label="Data *">
            <input data-testid="field-start-date" type="date" className={inputCls} value={value.start_date} onChange={set("start_date")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ora inizio"><input data-testid="field-start-time" type="time" className={inputCls} value={value.start_time} onChange={set("start_time")} /></Field>
            <Field label="Ora fine"><input data-testid="field-end-time" type="time" className={inputCls} value={value.end_time} onChange={set("end_time")} /></Field>
          </div>
        </>
      )}
      <Field label={isEvent ? "Locale / Indirizzo" : "Indirizzo"}>
        <input data-testid="field-address" className={inputCls} value={value.address} onChange={set("address")} placeholder="Es. Via Pretoria 12" />
      </Field>
      {!isEvent && (
        <Field label={kind === "activity" ? "Quando / Orari" : "Orari di apertura"}>
          <input data-testid="field-opening-hours" className={inputCls} value={value.opening_hours} onChange={set("opening_hours")} placeholder="Es. Mar–Dom 18:00 – 02:00" />
        </Field>
      )}
      {kind !== "place" && (
        <Field label={isEvent ? "Prezzo / Ingresso" : "Prezzi"}>
          <input data-testid="field-price" className={inputCls} value={value.price} onChange={set("price")} placeholder="Es. Ingresso libero" />
        </Field>
      )}
      {cfg?.themes?.length > 0 && (
        <Field label="Vivi Potenza (dove farlo trovare)" hint="Facoltativo: scegli una o più categorie tematiche">
          <div className="flex flex-wrap gap-2">
            {cfg.themes.map((t) => {
              const on = (value.themes || []).includes(t.slug);
              return (
                <button type="button" key={t.slug} data-testid={`field-theme-${t.slug}`} onClick={() => onChange({ themes: on ? value.themes.filter((x) => x !== t.slug) : [...(value.themes || []), t.slug] })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 bg-white/5 text-zinc-400"}`}>{t.name}</button>
              );
            })}
          </div>
        </Field>
      )}
      <Field label="Descrizione">
        <textarea data-testid="field-description" rows={4} className={inputCls} value={value.description} onChange={set("description")} placeholder="Racconta cosa si fa, l'atmosfera, chi c'è…" />
      </Field>
      <ImageInput value={value.image_url} onChange={set("image_url")} />
      <Field label="Link Instagram">
        <input data-testid="field-instagram" className={inputCls} value={value.instagram} onChange={set("instagram")} placeholder="https://instagram.com/…" />
      </Field>
      <Field label="Link info / biglietti">
        <input data-testid="field-info-link" className={inputCls} value={value.info_link} onChange={set("info_link")} placeholder="https://…" />
      </Field>
    </div>
  );
};
