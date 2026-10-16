import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";
import { useAdminAction } from "@/components/admin/AdminQueue";

export const AdminSettings = () => {
  const act = useAdminAction();
  const { user, lockAdmin } = useAuth();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: async () => (await adminApi.get("/admin/settings")).data });
  const [threshold, setThreshold] = useState(20);
  const [pin, setPin] = useState("");
  useEffect(() => { if (data) setThreshold(data.threshold); }, [data]);

  const saveThreshold = () => act(() => adminApi.put("/admin/settings", { threshold: Number(threshold) }), "Soglia aggiornata");
  const savePin = () =>
    act(async () => {
      await adminApi.put("/admin/settings", { new_pin: pin });
      setPin("");
      if (user?.role !== "admin") lockAdmin();
    }, "PIN aggiornato. Usa il nuovo PIN per i prossimi accessi");

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/10 bg-[#16161F] p-4">
        <Field label="Soglia numeri presenze" hint="Sotto questa soglia si vede solo il badge di tendenza, sopra compare anche il numero.">
          <input data-testid="settings-threshold-input" type="number" min={1} className={inputCls} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </Field>
        <PrimaryButton data-testid="settings-threshold-save" className="mt-3" onClick={saveThreshold}>Salva soglia</PrimaryButton>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#16161F] p-4">
        <Field label="Nuovo PIN Admin" hint="Minimo 4 caratteri. Chi è entrato con il vecchio PIN dovrà reinserirlo.">
          <input data-testid="settings-pin-input" type="password" className={inputCls} value={pin} onChange={(e) => setPin(e.target.value)} />
        </Field>
        <PrimaryButton data-testid="settings-pin-save" className="mt-3" onClick={savePin} disabled={pin.length < 4}>Cambia PIN</PrimaryButton>
      </div>
    </div>
  );
};
