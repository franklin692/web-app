import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api, imgUrl, errMsg } from "@/lib/api";
import { inputCls, Field } from "@/components/forms/Field";

export const ImageInput = ({ value, onChange }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      onChange(data.url);
      toast.success("Foto caricata");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label="Foto / Locandina">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <img data-testid="image-preview" src={imgUrl(value)} alt="anteprima" className="h-40 w-full object-cover" />
          <button type="button" data-testid="image-remove-button" onClick={() => onChange("")} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button type="button" data-testid="image-upload-button" onClick={() => ref.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 py-5 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/10">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />} {busy ? "Caricamento…" : "Carica dal telefono"}
          </button>
          <input data-testid="image-url-input" className={inputCls} placeholder="…oppure incolla un link immagine" onBlur={(e) => e.target.value.startsWith("http") && onChange(e.target.value.trim())} />
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" hidden data-testid="image-file-input" onChange={(e) => upload(e.target.files?.[0])} />
    </Field>
  );
};
