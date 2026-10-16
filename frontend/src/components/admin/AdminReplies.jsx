import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { timeAgo } from "@/lib/meta";

export const AdminReplies = () => {
  const { data } = useQuery({ queryKey: ["admin", "replies"], queryFn: async () => (await adminApi.get("/admin/replies")).data });
  if (data?.length === 0) return <p data-testid="admin-replies-empty" className="py-12 text-center text-sm text-zinc-500">Nessuna risposta privata ricevuta.</p>;
  return (
    <ul data-testid="admin-replies-list" className="flex flex-col gap-3">
      {data?.map((r) => (
        <li key={r.id} data-testid={`admin-reply-${r.id}`} className="rounded-2xl border border-white/10 bg-[#16161F] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Risposta a: <span className="text-pink-300">{r.spotted_where}</span></p>
          <p className="mt-2 text-sm text-zinc-200">{r.message}</p>
          <div className="mt-2 flex justify-between text-xs"><span className="font-semibold text-pink-300">{r.contact}</span><span className="text-zinc-500">{timeAgo(r.created_at)}</span></div>
        </li>
      ))}
    </ul>
  );
};
