import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { imgUrl } from "@/lib/api";
import { useConfig } from "@/hooks/useConfig";

export const openAdd = (themes = []) => window.dispatchEvent(new CustomEvent("cfp-add", { detail: { themes } }));

export const PublishButton = ({ testId, className = "" }) => (
  <button data-testid={testId} onClick={() => openAdd()}
    className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(236,72,153,0.45)] transition-transform active:scale-95 ${className}`}>
    <Plus className="h-4 w-4" strokeWidth={2.8} /> Pubblica
  </button>
);

export const TopBar = () => {
  const cfg = useConfig();
  return (
    <div data-testid="top-bar" className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-white/5 bg-[#0B0B0F]/90 px-5 backdrop-blur-xl">
      <Link to="/" data-testid="top-bar-home" className="flex min-w-0 items-center gap-2">
        {cfg?.logo_url && <img src={imgUrl(cfg.logo_url)} alt="" className="h-6 w-6 rounded-md object-cover" />}
        <span className="truncate font-display text-sm font-black tracking-tight">{cfg?.app_name || "Cosa Fare a Potenza"}</span>
      </Link>
      <PublishButton testId="top-publish-button" className="ml-auto" />
    </div>
  );
};
