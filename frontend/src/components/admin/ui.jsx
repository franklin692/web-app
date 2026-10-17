import { useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errMsg } from "@/lib/api";
import { DynIcon, ICON_NAMES } from "@/lib/icons";
import { inputCls } from "@/components/forms/Field";

export const IconBtn = ({ onClick, icon: Icon, label, cls = "", testId }) => (
  <button data-testid={testId} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${cls}`}>
    {Icon && <Icon className="h-4 w-4" />}{label}
  </button>
);

export const useAdminAction = () => {
  const qc = useQueryClient();
  return async (fn, msg) => {
    try {
      const r = await fn();
      if (msg) toast.success(msg);
      qc.invalidateQueries();
      return r;
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
};

export const Card = ({ children, className = "", testId }) => <div data-testid={testId} className={`rounded-2xl border border-white/10 bg-[#16161F] p-4 ${className}`}>{children}</div>;
export const H = ({ children }) => <p className="mb-2 mt-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{children}</p>;
export const Inp = ({ testId, className = "", ...p }) => <input data-testid={testId} className={`${inputCls} py-2.5 ${className}`} {...p} />;

export const Toggle = ({ checked, onChange, label, testId }) => (
  <button type="button" role="switch" aria-checked={!!checked} data-testid={testId} onClick={() => onChange(!checked)} className="flex shrink-0 items-center gap-2 text-left text-sm text-zinc-200">
    <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-gradient-to-r from-violet-600 to-pink-600" : "bg-white/10"}`}>
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </span>
    {label}
  </button>
);

export const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

export const Move = ({ onUp, onDown, testId }) => (
  <span className="flex flex-col">
    <button type="button" data-testid={`${testId}-up`} onClick={onUp} className="text-zinc-400 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
    <button type="button" data-testid={`${testId}-down`} onClick={onDown} className="text-zinc-400 hover:text-white"><ChevronDown className="h-4 w-4" /></button>
  </span>
);

export const ColorInput = ({ value, onChange, testId }) => (
  <label className="flex items-center gap-2 text-xs text-zinc-400">
    <input data-testid={testId} type="color" value={value || "#8B5CF6"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
    {value}
  </label>
);

export const IconPicker = ({ value, onChange, testId }) => (
  <div data-testid={testId} className="grid grid-cols-8 gap-1.5">
    {ICON_NAMES.map((n) => (
      <button type="button" key={n} title={n} onClick={() => onChange(n)} className={`flex h-9 items-center justify-center rounded-lg border ${value === n ? "border-pink-400 bg-pink-500/20" : "border-white/10 bg-white/5"}`}>
        <DynIcon name={n} className="h-4 w-4" />
      </button>
    ))}
  </div>
);

export const ChipsInput = ({ value = [], onChange, placeholder, testId }) => {
  const [t, setT] = useState("");
  const add = () => { if (t.trim() && !value.includes(t.trim())) onChange([...value, t.trim()]); setT(""); };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
            <button type="button" onClick={() => onChange(move(value, i, -1))} className="text-zinc-500">‹</button>{v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))}><X className="h-3 w-3 text-zinc-400" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Inp testId={testId} value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <button type="button" data-testid={`${testId}-add`} onClick={add} className="shrink-0 rounded-xl bg-white/10 px-3 text-sm font-bold">+</button>
      </div>
    </div>
  );
};

export const askReason = () => window.prompt("Motivo del rifiuto (visibile all'autore):", "Contenuto non conforme alle regole");
