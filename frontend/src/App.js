import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { AddSheet } from "@/components/AddSheet";
import Explore from "@/pages/Explore";
import MapRadar from "@/pages/MapRadar";
import SpottedPage from "@/pages/SpottedPage";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";

function Shell() {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#050507]">
      <div className="app-frame relative mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-[#0B0B0F] pb-32 text-zinc-100 md:border-x md:border-white/5">
        <div className="grain pointer-events-none fixed inset-0 z-0 mx-auto max-w-md" />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route path="/item/:id" element={<Explore />} />
            <Route path="/mappa" element={<MapRadar />} />
            <Route path="/spotted" element={<SpottedPage />} />
            <Route path="/profilo" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav onPlus={() => setAddOpen(true)} />
        <AddSheet open={addOpen} onOpenChange={setAddOpen} />
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
