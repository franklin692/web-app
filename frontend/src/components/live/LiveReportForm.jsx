import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useConfig } from "@/hooks/useConfig";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";
import { TAG_CLS } from "@/components/live/LiveRow";

const TAGS = { pieno: "🔥 Pieno / Molta gente", parcheggio: "🚗 Parcheggio pieno / Traffico", fila: "⏳ Fila all'ingresso", musica: "🎶 Musica / Serata top", avviso: "⚠️ Avviso / Disservizio in zona" };

export const LiveReportForm = ({ item, onDone }) => {
  const cfg = useConfig();
  const qc = useQueryClient();
  const [where, setWhere] = useState(item ? `i:${item.id}` : "");
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const places = useQuery({ queryKey: ["items", "", "all", ""], queryFn: async () => (await api.get("/items", { params: { when: "all" } })).data, enabled: !item });
  const spots = (places.data || []).filter((p) => p.kind !== "event" || p.live);
  const send = async () => {
    if (!where) return toast.error("Scegli la zona o il luogo");
    if (!tag) return toast.error("Scegli cosa succede");
    setBusy(true);
    try {
      const body = where.startsWith("i:") ? { item_id: where.slice(2) } : { zone: where.slice(2) };
      await api.post("/live/reports", { ...body, tag, note });
      toast.success("Segnalazione pubblicata per 3 ore 📡");
      qc.invalidateQueries({ queryKey: ["live"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      onDone?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-testid="live-report-form" className="flex flex-col gap-5">
      {item ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">📍 {item.title}</p> : (
        <Field label="Zona o luogo">
          <select data-testid="live-where-select" value={where} onChange={(e) => setWhere(e.target.value)} className={`${inputCls} appearance-none`}>
            <option value="">Scegli…</option>
            <optgroup label="Zone di Potenza">{(cfg?.zones || []).map((z) => <option key={z} value={`z:${z}`}>{z}</option>)}</optgroup>
            {spots.length > 0 && <optgroup label="Locali, luoghi ed eventi in corso">{spots.map((p) => <option key={p.id} value={`i:${p.id}`}>{p.title}</option>)}</optgroup>}
            <optgroup label="Comuni">{(cfg?.towns || []).filter((t) => t.name !== "Potenza").map((t) => <option key={t.name} value={`z:${t.name}`}>{t.name}</option>)}</optgroup>
          </select>
        </Field>
      )}
      <Field label="Cosa succede?">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TAGS).map(([k, l]) => (
            <button type="button" key={k} data-testid={`live-tag-${k}`} onClick={() => setTag(k)}
              className={`rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${tag === k ? `${TAG_CLS[k]} ring-2 ring-white/30` : "border-white/10 bg-white/5 text-zinc-300"}`}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="Nota (facoltativa)"><input data-testid="live-note-input" maxLength={200} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. fila di 15 minuti, dj fino alle 2" /></Field>
      <PrimaryButton data-testid="live-submit-button" onClick={send} disabled={busy}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Pubblica per 3 ore</PrimaryButton>
    </div>
  );
};
