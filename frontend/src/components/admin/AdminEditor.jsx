import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { EMPTY_ITEM } from "@/lib/meta";
import { useCats } from "@/hooks/useConfig";
import { Sheet } from "@/components/Sheet";
import { KindPicker, usePickOptions, EntryForm, emptyFor, validateEntry } from "@/components/AddSheet";
import { PrimaryButton } from "@/components/forms/Field";
import { useAdminAction } from "@/components/admin/ui";
import { toast } from "sonner";
import { AiAssistant, AiEntryCard } from "@/components/ai/AiAssistant";

// target: { mode: "new", only?: "item"|"post" } | { mode: "edit", entity: "item"|"post", data, approve? }
export const AdminEditor = ({ target, onClose }) => {
  const act = useAdminAction();
  const cats = useCats();
  const options = usePickOptions();
  const [opt, setOpt] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    if (!target) return;
    setAi(false);
    if (target.mode === "edit") {
      const d = target.data;
      const o = target.entity === "item" ? options.find((x) => x.id === `cat:${d.kind}`) || { type: "item", slug: d.kind, title: d.kind } : options.find((x) => x.id === `sec:${d.section}`);
      setOpt(o || null);
      setForm(target.entity === "item" ? Object.fromEntries(Object.keys(EMPTY_ITEM).map((k) => [k, d[k] ?? EMPTY_ITEM[k]])) : { data: { ...d.data }, tag: d.tag });
    } else setOpt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const save = async () => {
    const err = validateEntry(opt, form, cats);
    if (err) return toast.error(err);
    setBusy(true);
    const isItem = opt.type === "item";
    const base = isItem ? "/admin/items" : "/admin/posts";
    await act(async () => {
      if (target.mode === "edit") {
        await adminApi.put(`${base}/${target.data.id}`, isItem ? { ...form, kind: opt.slug } : form);
        if (target.approve) await adminApi.post(`${base}/${target.data.id}/status`, { status: "approved" });
      } else await adminApi.post(base, isItem ? { ...form, kind: opt.slug } : { ...form, section: opt.slug });
      onClose();
    }, target.mode === "new" ? "Pubblicato subito ✅" : target.approve ? "Modificato e approvato ✅" : "Modifiche salvate");
    setBusy(false);
  };

  const list = target?.only ? options.filter((o) => o.type === target.only) : options;
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()} testId="admin-editor-sheet" title={target?.mode === "new" ? (opt ? `Pubblica: ${opt.title}` : "Inserimento diretto") : "Modifica contenuto"} subtitle={target?.mode === "new" ? "Pubblicato subito, senza coda" : null}>
      {!opt ? (
        target?.mode === "edit" ? <p className="text-sm text-zinc-400">Categoria o sezione nascosta: riattivala per modificare.</p> : ai ? <AiAssistant options={list} onUse={({ opt: o, form: f }) => { setOpt(o); setForm(f); }} /> : <><AiEntryCard onClick={() => setAi(true)} /><KindPicker options={list} onPick={(o) => { setOpt(o); setForm(emptyFor(o)); }} /></>
      ) : (
        <div className="flex flex-col gap-5">
          <EntryForm opt={opt} form={form} setForm={setForm} />
          <PrimaryButton data-testid="admin-editor-save" onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}{target?.mode === "new" ? "Pubblica ora" : target?.approve ? "Salva e approva" : "Salva modifiche"}
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  );
};
