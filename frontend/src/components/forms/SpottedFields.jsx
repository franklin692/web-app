import { SPOT_TAGS } from "@/lib/meta";
import { Field, inputCls } from "@/components/forms/Field";

export const SpottedFields = ({ value, onChange }) => {
  const set = (k) => (e) => onChange({ [k]: e.target.value });
  return (
    <div className="flex flex-col gap-4">
      <Field label="Dove *">
        <input data-testid="spotted-field-where" className={inputCls} value={value.where} onChange={set("where")} placeholder="Es. McDonald's Gallitello" />
      </Field>
      <Field label="Zona / Filtro">
        <div className="flex flex-wrap gap-2">
          {SPOT_TAGS.filter((t) => t.id).map((t) => (
            <button type="button" key={t.id} data-testid={`spotted-field-tag-${t.id}`} onClick={() => onChange({ tag: t.id })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${value.tag === t.id ? "border-pink-400 bg-pink-500/20 text-pink-100" : "border-white/10 bg-white/5 text-zinc-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Quando">
        <input data-testid="spotted-field-when" className={inputCls} value={value.when} onChange={set("when")} placeholder="Es. Venerdì ore 19:30" />
      </Field>
      <Field label="Chi cerco (dettagli)">
        <input data-testid="spotted-field-who" className={inputCls} value={value.who} onChange={set("who")} placeholder="Es. Ragazza bionda con cappotto nero" />
      </Field>
      <Field label="Messaggio *" hint="Niente nomi, numeri di telefono o dati personali.">
        <textarea data-testid="spotted-field-message" rows={4} className={inputCls} value={value.message} onChange={set("message")} placeholder="Scrivi il tuo Spotted…" />
      </Field>
    </div>
  );
};
