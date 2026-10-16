import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Lock, Trash2, Pencil } from "lucide-react";
import { adminApi, imgUrl } from "@/lib/api";
import { ImageInput } from "@/components/forms/ImageInput";
import { PrimaryButton } from "@/components/forms/Field";
import { Card, H, Inp, IconBtn, useAdminAction } from "@/components/admin/ui";

const EMPTY = { question: "", options: ["", "", "", ""], image_url: "", comment: "", start_date: "" };

export const AdminPolls = () => {
  const act = useAdminAction();
  const [f, setF] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const { data } = useQuery({ queryKey: ["admin", "polls"], queryFn: async () => (await adminApi.get("/admin/polls")).data });
  const save = () => act(async () => {
    const body = { ...f, options: f.options.filter((o) => o.trim()) };
    if (editId) await adminApi.put(`/admin/polls/${editId}`, body); else await adminApi.post("/admin/polls", body);
    setF(EMPTY); setEditId(null);
  }, editId ? "Sondaggio aggiornato" : "Sondaggio creato");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-4">
      <Card testId="poll-form">
        <H>{editId ? "Modifica sondaggio" : "Nuovo sondaggio"}</H>
        <div className="flex flex-col gap-2">
          <Inp testId="poll-question-input" placeholder="Domanda" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
          {f.options.map((o, i) => <Inp key={i} testId={`poll-option-input-${i}`} placeholder={`Opzione ${i + 1}${i > 1 ? " (facoltativa)" : ""}`} value={o} onChange={(e) => setF({ ...f, options: f.options.map((x, j) => (j === i ? e.target.value : x)) })} />)}
          <Inp testId="poll-comment-input" placeholder="Commento ai risultati (es. Potenza ha deciso…)" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
          <label className="text-xs text-zinc-400">Attivo dal<Inp testId="poll-date-input" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
          <ImageInput value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} label="Immagine (facoltativa)" />
          <PrimaryButton data-testid="poll-save-button" onClick={save}>{editId ? "Salva" : "Crea sondaggio"}</PrimaryButton>
          {editId && <button onClick={() => { setF(EMPTY); setEditId(null); }} className="text-xs text-zinc-500">Annulla modifica</button>}
        </div>
      </Card>
      {data?.map((p) => {
        const state = p.status === "closed" ? "Chiuso" : p.start_date > today ? "In coda" : "Attivo";
        return (
          <Card key={p.id} testId={`admin-poll-${p.id}`}>
            <div className="flex items-start gap-3">
              {p.image_url && <img src={imgUrl(p.image_url)} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300"><BarChart3 className="inline h-3 w-3" /> {state} · dal {p.start_date} · {p.total} voti</p>
                <p className="font-display font-semibold">{p.question}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">{p.options.map((o, i) => <div key={i} className="flex justify-between text-xs text-zinc-300"><span>{o.text}</span><span>{o.votes} · {o.pct}%</span></div>)}</div>
            <div className="mt-3 flex gap-2">
              <IconBtn testId={`poll-edit-${p.id}`} icon={Pencil} cls="border-white/10 bg-white/5" onClick={() => { setEditId(p.id); setF({ question: p.question, options: [...p.options.map((o) => o.text), "", "", ""].slice(0, 4), image_url: p.image_url, comment: p.comment || "", start_date: p.start_date }); window.scrollTo(0, 0); }} />
              {p.status !== "closed" && <IconBtn testId={`poll-close-${p.id}`} icon={Lock} label="Chiudi" cls="border-amber-400/40 bg-amber-500/10 text-amber-200" onClick={() => act(() => adminApi.post(`/admin/polls/${p.id}/close`), "Sondaggio chiuso")} />}
              <IconBtn testId={`poll-delete-${p.id}`} icon={Trash2} cls="border-white/10 bg-white/5 text-zinc-400" onClick={() => window.confirm("Eliminare il sondaggio?") && act(() => adminApi.delete(`/admin/polls/${p.id}`), "Eliminato")} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};
