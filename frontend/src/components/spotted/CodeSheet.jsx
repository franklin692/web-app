import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { STATUS } from "@/lib/meta";
import { Sheet } from "@/components/Sheet";
import { inputCls, PrimaryButton } from "@/components/forms/Field";
import { RepliesList } from "@/components/spotted/RepliesList";

export const CodeSheet = ({ open, onOpenChange }) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const saved = JSON.parse(localStorage.getItem("cfp_spotted_codes") || "[]");

  const lookup = async (c = code) => {
    if (!c.trim()) return;
    setBusy(true);
    try {
      setRes((await api.post("/spotted-code", { code: c })).data);
      setCode(c);
    } catch (e) {
      toast.error(errMsg(e));
      setRes(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} testId="code-sheet" title="Leggi risposte con codice" subtitle="Inserisci il codice segreto ricevuto quando hai inviato lo Spotted">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input data-testid="code-input" className={`${inputCls} font-mono uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="SPOT-XXXXXX" />
          <button data-testid="code-submit-button" onClick={() => lookup()} className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 text-white">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
          </button>
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[11px] font-bold uppercase tracking-wider text-zinc-500">Codici salvati su questo dispositivo</span>
            {saved.map((c) => <button key={c} data-testid={`saved-code-${c}`} onClick={() => lookup(c)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-zinc-200">{c}</button>)}
          </div>
        )}
        {res && (
          <div data-testid="code-result" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#16161F] p-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">{res.spotted.where}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS[res.spotted.status]?.cls}`}>{STATUS[res.spotted.status]?.label}</span>
            </div>
            <p className="text-sm text-zinc-400">“{res.spotted.message}”</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Risposte private ({res.replies.length})</p>
            <RepliesList replies={res.replies} testId="code-replies" />
          </div>
        )}
      </div>
    </Sheet>
  );
};
