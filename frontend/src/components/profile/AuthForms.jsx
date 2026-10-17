import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field, inputCls, PrimaryButton } from "@/components/forms/Field";
import { Toggle } from "@/components/admin/ui";

export const AuthForms = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ identifier: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [news, setNews] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(f.identifier, f.password);
      else await register(f.username, f.email, f.password, news);
      toast.success("Benvenuto/a! 👋");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#16161F]/80 p-5 backdrop-blur-md">
      <div className="mb-5 flex rounded-2xl bg-black/40 p-1">
        {[["login", "Accedi"], ["register", "Registrati"]].map(([m, l]) => (
          <button key={m} data-testid={`auth-tab-${m}`} onClick={() => setMode(m)} className={`flex-1 rounded-xl py-2 text-sm font-bold transition-all ${mode === m ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white" : "text-zinc-400"}`}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "login" ? (
          <Field label="Email o Username"><input data-testid="login-identifier-input" className={inputCls} value={f.identifier} onChange={set("identifier")} autoComplete="username" /></Field>
        ) : (
          <>
            <Field label="Username"><input data-testid="register-username-input" className={inputCls} value={f.username} onChange={set("username")} autoComplete="username" /></Field>
            <Field label="Email"><input data-testid="register-email-input" type="email" className={inputCls} value={f.email} onChange={set("email")} autoComplete="email" /></Field>
          </>
        )}
        <Field label="Password"><input data-testid="auth-password-input" type="password" className={inputCls} value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} /></Field>
        {mode === "register" && <Toggle testId="register-newsletter-toggle" checked={news} onChange={setNews} label={<span className="text-xs">Iscrivimi alla Newsletter del Weekend 📧</span>} />}
        <PrimaryButton data-testid="auth-submit-button" type="submit" disabled={busy}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} {mode === "login" ? "Accedi" : "Crea account"}
        </PrimaryButton>
      </form>
    </div>
  );
};
