import { useState, useEffect } from "react";
import { Sheet } from "@/components/Sheet";
import { LiveReportForm } from "@/components/live/LiveReportForm";
import { useAuth } from "@/context/AuthContext";
import { askLogin } from "@/hooks/useConfig";

export const LiveSheet = () => {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  useEffect(() => {
    const h = (e) => (user ? setState({ item: e.detail?.item || null }) : askLogin());
    window.addEventListener("cfp-live", h);
    return () => window.removeEventListener("cfp-live", h);
  }, [user]);
  return (
    <Sheet open={!!state} onOpenChange={(o) => !o && setState(null)} testId="live-sheet" title="Segnala la situazione 📡" subtitle="Visibile a tutti per 3 ore">
      {state && <LiveReportForm item={state.item} onDone={() => setState(null)} />}
    </Sheet>
  );
};
