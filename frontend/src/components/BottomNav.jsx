import { NavLink } from "react-router-dom";
import { Compass, Info, Flame, LayoutGrid, LogIn, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const Tab = ({ to, icon: Icon, label, testId, dot, badge }) => (
  <NavLink
    to={to}
    end={to === "/"}
    data-testid={testId}
    className={({ isActive }) =>
      `relative flex w-16 flex-col items-center gap-1 py-1 text-[10px] font-semibold tracking-wide transition-colors ${isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`
    }
  >
    {({ isActive }) => (
      <>
        <Icon className={`h-[22px] w-[22px] transition-transform ${isActive ? "scale-110 text-violet-300" : ""}`} strokeWidth={isActive ? 2.4 : 2} />
        {label}
        {badge > 0 && <span data-testid="unread-badge" className="absolute right-3 -top-1 min-w-[18px] rounded-full bg-pink-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{badge}</span>}
        {dot && <span className="absolute right-4 top-0 h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_8px_#F97316]" />}
        {isActive && <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />}
      </>
    )}
  </NavLink>
);

export const BottomNav = () => {
  const { user, isAdmin } = useAuth();
  const unread = useQuery({ queryKey: ["me", "unread"], queryFn: async () => (await api.get("/me/unread")).data.count, enabled: !!user, refetchInterval: 60_000 }).data;
  return (
    <nav data-testid="bottom-nav" className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-white/10 bg-[#0F0F16]/90 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl">
      <div className="flex items-end justify-around">
        <Tab to="/" icon={Compass} label="Esplora" testId="nav-explore" />
        <Tab to="/info" icon={Info} label="Info" testId="nav-info" />
        <NavLink to="/vivi" data-testid="nav-vivi" aria-label="Vivi Potenza" className="relative -top-5 flex flex-col items-center gap-1 text-[10px] font-bold text-white">
          {({ isActive }) => (
            <>
              <span className={`plus-glow flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-orange-500 transition-transform active:scale-90 ${isActive ? "scale-105" : ""}`}>
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-pink-600"><Flame className="h-7 w-7" strokeWidth={2.4} /></span>
              </span>
              <span className={isActive ? "text-white" : "text-zinc-300"}>Vivi</span>
            </>
          )}
        </NavLink>
        <Tab to="/bacheca" icon={LayoutGrid} label="Bacheca" testId="nav-board" />
        <Tab to="/profilo" icon={user ? UserRound : LogIn} label={user ? "Profilo" : "Accedi"} testId="nav-profile" dot={isAdmin && !unread} badge={unread} />
      </div>
    </nav>
  );
};
