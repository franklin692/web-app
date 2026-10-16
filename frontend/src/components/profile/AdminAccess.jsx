import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { inputCls } from "@/components/forms/Field";

export const AdminAccess = () => {
  const { isAdmin, unlockPin, lockAdmin, user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const unlock = async () => {
    setBusy(true);
    try {
      await unlockPin(pin);
      toast.success("Accesso Admin sbloccato");
      nav("/admin");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (isAdmin)
    return (
      <div className="flex flex-col gap-2">
        <button data-testid="open-admin-panel-button" onClick={() => nav("/admin")} className="flex w-full items-center gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-pink-500/15 p-4 text-left">
          <ShieldCheck className="h-6 w-6 text-orange-300" />
          <span className="flex-1"><span className="block font-display font-bold">Pannello Admin</span><span className="text-xs text-zinc-400">Approva, gestisci e fai salire la classifica</span></span>
          <ChevronRight className="h-5 w-5 text-zinc-400" />
        </button>
        {user?.role !== "admin" && <button data-testid="lock-admin-button" onClick={lockAdmin} className="text-xs text-zinc-500 underline">Esci dalla modalità Admin</button>}
      </div>
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#16161F]/60 p-4">
      <button data-testid="unlock-admin-toggle" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-left">
        <Lock className="h-5 w-5 text-zinc-400" />
        <span className="flex-1 text-sm font-semibold text-zinc-300">Sblocca Admin con PIN</span>
        <ChevronRight className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 flex gap-2">
          <input data-testid="admin-pin-input" type="password" className={inputCls} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN Admin" onKeyDown={(e) => e.key === "Enter" && unlock()} />
          <button data-testid="admin-pin-submit" onClick={unlock} className="shrink-0 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 px-4 text-sm font-bold text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sblocca"}
          </button>
        </div>
      )}
    </div>
  );
};
