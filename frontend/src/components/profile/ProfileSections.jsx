import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { STATUS, KINDS, tagLabel } from "@/lib/meta";
import { ItemCard } from "@/components/ItemCard";
import { RepliesList } from "@/components/spotted/RepliesList";

const Empty = ({ children, testId }) => <p data-testid={testId} className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">{children}</p>;
const StatusPill = ({ s }) => <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS[s]?.cls}`}>{STATUS[s]?.label}</span>;

const Saved = () => {
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ["saved"], queryFn: async () => (await api.get("/me/saved")).data });
  if (data?.length === 0) return <Empty testId="saved-empty">Nessun salvato. Tocca ⭐ su un evento o locale.</Empty>;
  return <div data-testid="saved-list" className="flex flex-col gap-3">{data?.map((it, i) => <ItemCard key={it.id} item={it} index={i} onOpen={(id) => nav(`/item/${id}`)} />)}</div>;
};

const MySpotted = () => {
  const { data } = useQuery({ queryKey: ["me", "spotted"], queryFn: async () => (await api.get("/me/spotted")).data });
  if (data?.length === 0) return <Empty testId="my-spotted-empty">Non hai ancora inviato Spotted.</Empty>;
  return (
    <div data-testid="my-spotted-list" className="flex flex-col gap-3">
      {data?.map((s) => (
        <div key={s.id} data-testid={`my-spotted-${s.id}`} className="rounded-2xl border border-white/10 bg-[#16161F] p-4">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-pink-300">{tagLabel(s.tag)}</span><StatusPill s={s.status} /></div>
          <p className="font-display font-semibold">{s.where}</p>
          <p className="mt-1 text-sm text-zinc-400">“{s.message}”</p>
          <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Risposte private ({s.replies.length})</p>
          <RepliesList replies={s.replies} testId={`my-spotted-replies-${s.id}`} />
        </div>
      ))}
    </div>
  );
};

const Submissions = () => {
  const { data } = useQuery({ queryKey: ["me", "submissions"], queryFn: async () => (await api.get("/me/submissions")).data });
  if (data?.length === 0) return <Empty testId="submissions-empty">Nessuna segnalazione. Usa il tasto + per aggiungere qualcosa.</Empty>;
  return (
    <ul data-testid="submissions-list" className="flex flex-col gap-2">
      {data?.map((s) => (
        <li key={s.id} data-testid={`submission-${s.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161F] p-3">
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{s.title}</span><span className="text-[11px] text-zinc-500">{s.kind === "spotted" ? "Spotted" : KINDS[s.kind]?.label}</span></span>
          <StatusPill s={s.status} />
        </li>
      ))}
    </ul>
  );
};

const TABS = [["saved", "Salvati ⭐", Saved], ["spotted", "I miei Spotted", MySpotted], ["subs", "Segnalazioni", Submissions]];

export const ProfileSections = () => {
  const [tab, setTab] = useState("saved");
  const Comp = TABS.find((t) => t[0] === tab)[2];
  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map(([id, l]) => (
          <button key={id} data-testid={`profile-tab-${id}`} onClick={() => setTab(id)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${tab === id ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400"}`}>{l}</button>
        ))}
      </div>
      <Comp />
    </div>
  );
};
