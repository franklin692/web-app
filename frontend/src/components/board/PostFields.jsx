import { useConfig } from "@/hooks/useConfig";
import { Field, Select, inputCls } from "@/components/forms/Field";
import { ImageInput } from "@/components/forms/ImageInput";

export const PlaceInput = ({ value, onChange, testId }) => {
  const cfg = useConfig();
  return (
    <>
      <input data-testid={testId} list="places-list" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Zona o paese" />
      <datalist id="places-list">{[...(cfg?.zones || []), ...(cfg?.towns || []).map((t) => t.name)].map((z) => <option key={z} value={z} />)}</datalist>
    </>
  );
};

const Input = ({ f, v, set }) => {
  const tid = `post-field-${f.key}`;
  switch (f.type) {
    case "textarea": return <textarea data-testid={tid} rows={4} className={inputCls} value={v} onChange={(e) => set(e.target.value)} />;
    case "select": return <Select testId={tid} value={v} onChange={set} options={f.options || []} placeholder="Scegli…" />;
    case "place": return <PlaceInput testId={tid} value={v} onChange={set} />;
    case "photo": return <ImageInput value={v} onChange={set} bare />;
    default: {
      const type = { number: "number", date: "date", time: "time", link: "url" }[f.type] || "text";
      return <input data-testid={tid} type={type} className={inputCls} value={v} onChange={(e) => set(e.target.value)} placeholder={f.type === "price" ? "Es. 250€" : f.type === "link" ? "https://…" : ""} />;
    }
  }
};

export const PostFields = ({ section, value, onChange }) => (
  <div className="flex flex-col gap-4">
    {section.tags?.length > 0 && (
      <Field label="Etichetta">
        <div className="flex flex-wrap gap-2">
          {section.tags.map((t) => (
            <button type="button" key={t} data-testid={`post-tag-${t}`} onClick={() => onChange({ tag: value.tag === t ? "" : t })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${value.tag === t ? "border-pink-400 bg-pink-500/20 text-pink-100" : "border-white/10 bg-white/5 text-zinc-300"}`}>{t}</button>
          ))}
        </div>
      </Field>
    )}
    {section.fields.map((f) => (
      <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`}>
        <Input f={f} v={value.data[f.key] ?? ""} set={(v) => onChange({ data: { ...value.data, [f.key]: v } })} />
      </Field>
    ))}
  </div>
);

export const missingRequired = (section, data) => section.fields.find((f) => f.required && !String(data[f.key] ?? "").trim());
