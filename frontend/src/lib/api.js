import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const getDeviceId = () => {
  let id = localStorage.getItem("cfp_device");
  if (!id) {
    id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("cfp_device", id);
  }
  return id;
};

export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((cfg) => {
  cfg.headers["X-Device-Id"] = getDeviceId();
  const t = localStorage.getItem("cfp_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const adminApi = axios.create({ baseURL: `${BACKEND_URL}/api` });
adminApi.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("cfp_admin_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const FALLBACK = "https://images.pexels.com/photos/33099812/pexels-photo-33099812.jpeg?auto=compress&cs=tinysrgb&w=940";
export const imgUrl = (u) => (!u ? FALLBACK : u.startsWith("/api") ? `${BACKEND_URL}${u}` : u);

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Qualcosa è andato storto, riprova.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return d.msg || String(d);
};
