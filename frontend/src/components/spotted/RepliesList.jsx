import { timeAgo } from "@/lib/meta";

export const RepliesList = ({ replies, testId }) =>
  replies?.length ? (
    <ul data-testid={testId} className="flex flex-col gap-2">
      {replies.map((r) => (
        <li key={r.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <p className="text-sm text-zinc-200">{r.message}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-pink-300">{r.contact}</span>
            <span className="text-zinc-500">{timeAgo(r.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p data-testid={testId} className="text-xs text-zinc-500">Nessuna risposta per ora.</p>
  );
