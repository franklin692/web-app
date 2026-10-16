import { LEVELS } from "@/lib/meta";

export const TrendBadge = ({ level, count, size = "sm", testId }) => {
  const l = LEVELS[level];
  if (!l) return null;
  const extra = count ? `${count} presenti` : l.extra;
  return (
    <span
      data-testid={testId || "trend-badge"}
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border font-semibold tracking-wide backdrop-blur-md ${l.cls} ${size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-[11px]"}`}
    >
      <span className={level >= 2 ? "flame-pulse inline-block" : "inline-block"}>{l.emoji}</span>
      {l.label}
      {extra && <span className="opacity-80">· {extra}</span>}
    </span>
  );
};
