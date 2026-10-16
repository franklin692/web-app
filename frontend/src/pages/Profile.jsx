import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthForms } from "@/components/profile/AuthForms";
import { AdminAccess } from "@/components/profile/AdminAccess";
import { ProfileSections } from "@/components/profile/ProfileSections";

export default function Profile() {
  const { user, logout, ready } = useAuth();
  if (!ready) return null;
  return (
    <div data-testid="profile-page" className="flex flex-col gap-6 px-5 pt-8">
      {user ? (
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500 font-display text-2xl font-black text-white">
            {user.username[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ciao</p>
            <h1 data-testid="profile-username" className="truncate font-display text-2xl font-black">@{user.username}</h1>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <button data-testid="logout-button" onClick={logout} className="rounded-full border border-white/10 bg-white/5 p-3 text-zinc-300 hover:bg-white/10" aria-label="Esci"><LogOut className="h-5 w-5" /></button>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Il tuo radar</p>
          <h1 className="mt-1 font-display text-4xl font-black tracking-tight">Entra in <span className="text-gradient">città</span></h1>
          <p className="mt-2 text-sm text-zinc-400">Puoi votare e segnalare anche senza account. Accedi per ritrovare salvati, Spotted e segnalazioni.</p>
        </div>
      )}
      {user ? <ProfileSections /> : <AuthForms />}
      <AdminAccess />
    </div>
  );
}
