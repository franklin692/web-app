import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, adminApi } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("cfp_admin_token"));

  useEffect(() => {
    if (!localStorage.getItem("cfp_token")) return setReady(true);
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("cfp_token"))
      .finally(() => setReady(true));
  }, []);

  const setAdmin = (t) => {
    if (t) localStorage.setItem("cfp_admin_token", t);
    else localStorage.removeItem("cfp_admin_token");
    setAdminToken(t);
  };

  const applySession = useCallback((data) => {
    localStorage.setItem("cfp_token", data.token);
    setUser(data.user);
    if (data.user.role === "admin") setAdmin(data.token);
    qc.invalidateQueries();
  }, [qc]);

  const login = async (identifier, password) => applySession((await api.post("/auth/login", { identifier, password })).data);
  const register = async (username, email, password) => applySession((await api.post("/auth/register", { username, email, password })).data);
  const unlockPin = async (pin) => setAdmin((await api.post("/admin/pin", { pin })).data.token);
  const lockAdmin = () => setAdmin(null);
  const logout = () => {
    localStorage.removeItem("cfp_token");
    setAdmin(null);
    setUser(null);
    qc.invalidateQueries();
  };
  const verifyAdmin = useCallback(() => adminApi.get("/admin/check").catch(() => setAdmin(null)), []);

  return (
    <AuthCtx.Provider value={{ user, ready, isAdmin: !!adminToken, login, register, logout, unlockPin, lockAdmin, verifyAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
