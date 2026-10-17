import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.removeItem("cfp_admin_token");
    if (!localStorage.getItem("cfp_token")) return setReady(true);
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("cfp_token"))
      .finally(() => setReady(true));
  }, []);

  const applySession = useCallback((data) => {
    localStorage.setItem("cfp_token", data.token);
    setUser(data.user);
    qc.invalidateQueries();
  }, [qc]);

  const login = async (identifier, password) => applySession((await api.post("/auth/login", { identifier, password })).data);
  const register = async (username, email, password, newsletter = false) => applySession((await api.post("/auth/register", { username, email, password, newsletter })).data);
  const logout = () => {
    localStorage.removeItem("cfp_token");
    setUser(null);
    qc.invalidateQueries();
  };
  const role = user?.role;
  return (
    <AuthCtx.Provider value={{ user, setUser, ready, isAdmin: role === "admin" || role === "superadmin", isSuper: role === "superadmin", login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
