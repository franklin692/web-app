import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { AddSheet } from "@/components/AddSheet";
import Explore from "@/pages/Explore";
import MapRadar from "@/pages/MapRadar";
import Board from "@/pages/Board";
import Vivi from "@/pages/Vivi";
import ViviTheme from "@/pages/ViviTheme";
import BoardSection from "@/pages/BoardSection";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/context/AuthContext";
import { useConfig } from "@/hooks/useConfig";
import { useEffect } from "react";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import Utility from "@/pages/Utility";
import InfoHub from "@/pages/InfoHub";
import Promos from "@/pages/Promos";
import LiveCity from "@/pages/LiveCity";
import { TopBar } from "@/components/TopBar";
import Contact from "@/pages/Contact";
import { LiveSheet } from "@/components/live/LiveSheet";
import { ProposalSheet } from "@/components/ProposalSheet";

function Shell() {
  const [addOpen, setAddOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [prefill, setPrefill] = useState([]);
  const { user } = useAuth();
  const cfg = useConfig();
  useEffect(() => { if (cfg?.app_name) document.title = cfg.app_name; }, [cfg?.app_name]);
  useEffect(() => {
    const h = () => setLoginOpen(true);
    window.addEventListener("cfp-login", h);
    return () => window.removeEventListener("cfp-login", h);
  }, []);
  useEffect(() => {
    const h = (e) => { setPrefill(e.detail?.themes || []); user ? setAddOpen(true) : setLoginOpen(true); };
    window.addEventListener("cfp-add", h);
    return () => window.removeEventListener("cfp-add", h);
  }, [user]);
  return (
    <div className="min-h-screen bg-[#050507]">
      <div className="app-frame relative mx-auto min-h-screen w-full max-w-md overflow-x-clip bg-[#0B0B0F] pb-32 text-zinc-100 md:border-x md:border-white/5">
        <div className="grain pointer-events-none fixed inset-0 z-0 mx-auto max-w-md" />
        <TopBar />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route path="/item/:id" element={<Explore />} />
            <Route path="/mappa" element={<MapRadar />} />
            <Route path="/vivi" element={<Vivi />} />
            <Route path="/vivi/:slug" element={<ViviTheme />} />
            <Route path="/bacheca" element={<Board />} />
            <Route path="/bacheca/:slug" element={<BoardSection />} />
            <Route path="/spotted" element={<Navigate to="/bacheca/spotted" replace />} />
            <Route path="/profilo" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/info-utili" element={<Utility />} />
            <Route path="/info" element={<InfoHub />} />
            <Route path="/info/promo" element={<Promos />} />
            <Route path="/info/live" element={<LiveCity />} />
            <Route path="/contatti" element={<Contact />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
        <LoginPrompt open={loginOpen} onOpenChange={setLoginOpen} />
        <AddSheet open={addOpen} onOpenChange={setAddOpen} prefillThemes={prefill} />
        <LiveSheet />
        <ProposalSheet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
        <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { background: "#16161F", border: "1px solid rgba(255,255,255,0.1)" } }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
