import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, errMsg } from "@/lib/api";
import { EMPTY_ITEM, EMPTY_SPOTTED, ADD_OPTIONS } from "@/lib/meta";
import { Sheet } from "@/components/Sheet";
import { KindPicker } from "@/components/AddSheet";
import { ItemFields } from "@/components/forms/ItemFields";
import { SpottedFields } from "@/components/forms/SpottedFields";
import { PrimaryButton } from "@/components/forms/Field";

const pickFields = (src, tpl) => Object.fromEntries(Object.keys(tpl).map((k) => [k, src?.[k] ?? tpl[k]]));

// target: { mode: "new" } | { mode: "edit", entity: "item"|"spotted", data, approve? }
export const AdminEditor = ({ target, onClose }) => {
  const qc = useQueryClient();
  const [kind, setKind] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    if (target.mode === "edit") {
      const k = target.entity === "spotted" ? "spotted" : target.data.kind;
      setKind(k);
      setForm(pickFields(target.data, k === "spotted" ? EMPTY_SPOTTED : EMPTY_ITEM));
    } else setKind(null);
  }, [target]);

  const pick = (k) => { setKind(k); setForm(k === "spotted" ? { ...EMPTY_SPOTTED } : { ...EMPTY_ITEM }); };
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    setBusy(true);
    try {
      const isSp = kind === "spotted";
      const base = isSp ? "/admin/spotted" : "/admin/items";
      const body = isSp ? form : { ...form, kind };
      if (target.mode === "edit") {
        await adminApi.put(`${base}/${target.data.id}`, body);
        if (target.approve) await adminApi.post(`${base}/${target.data.id}/status`, { status: "approved" });
      } else await adminApi.post(base, body);
      toast.success(target.mode === "new" ? "Pubblicato subito ✅" : target.approve ? "Modificato e approvato ✅" : "Modifiche salvate");
      qc.invalidateQueries();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const title = target?.mode === "new" ? (kind ? `Pubblica: ${ADD_OPTIONS.find((o) => o.kind === kind).title}` : "Inserimento diretto") : "Modifica contenuto";
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()} testId="admin-editor-sheet" title={title} subtitle={target?.mode === "new" ? "Pubblicato subito, senza coda" : null}>
      {!kind ? (
        <KindPicker onPick={pick} />
      ) : (
        <div className="flex flex-col gap-5">
          {kind === "spotted" ? <SpottedFields value={form} onChange={patch} /> : <ItemFields kind={kind} value={form} onChange={patch} />}
          <PrimaryButton data-testid="admin-editor-save" onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {target?.mode === "new" ? "Pubblica ora" : target?.approve ? "Salva e approva" : "Salva modifiche"}
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  );
};
