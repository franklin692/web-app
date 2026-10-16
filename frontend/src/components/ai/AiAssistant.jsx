import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, ImagePlus, Loader2, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api, BACKEND_URL, getDeviceId, imgUrl, errMsg } from "@/lib/api";
import { EMPTY_ITEM } from "@/lib/meta";

export const draftToEntry = (d, options) => {
  const opt = options.find((o) => o.id === (d.target === "item" ? `cat:${d.kind}` : `sec:${d.section}`));
  if (!opt) return null;
  const form = d.target === "item" ? { ...EMPTY_ITEM, ...d.fields, themes: d.fields.themes || [] } : { data: { ...d.fields }, tag: d.tag || "" };
  return { opt, form };
};

const INTRO = "Ciao! Sono Lucy ✨ Incollami un link (anche un post Instagram), scrivimi i dettagli o mandami la foto di una locandina: preparo io l'annuncio e tu controlli prima di inviarlo.";

const Bubble = ({ m }) => (
  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "rounded-br-md bg-gradient-to-r from-violet-600 to-pink-600 text-white" : "rounded-bl-md border border-white/10 bg-[#1C1C28] text-zinc-100"}`}>
      {m.image && <img src={imgUrl(m.image)} alt="" className="mb-2 max-h-40 rounded-xl object-cover" />}
      {m.text || <Loader2 className="h-4 w-4 animate-spin text-violet-300" />}
    </div>
  </div>
);

export const AiAssistant = ({ options, onUse }) => {
  const [sid] = useState(() => `s${Date.now()}${Math.random().toString(36).slice(2, 8)}`);
  const [msgs, setMsgs] = useState([{ role: "assistant", text: INTRO }]);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState(null);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, draft]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      setImage((await api.post("/upload", fd)).data.url);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (busy || (!text.trim() && !image)) return;
    const body = { session_id: sid, message: text.trim(), image_url: image };
    setMsgs((m) => [...m, { role: "user", text: body.message, image }, { role: "assistant", text: "" }]);
    setText(""); setImage(""); setBusy(true);
    const append = (c) => setMsgs((m) => { const n = [...m]; n[n.length - 1] = { ...n[n.length - 1], text: n[n.length - 1].text + c }; return n; });
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("cfp_token")}`, "X-Device-Id": getDeviceId() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Lucy non è disponibile, riprova.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const ev = JSON.parse(p.slice(6));
          if (ev.t === "delta" || ev.t === "error") append(ev.c);
          if (ev.t === "done" && ev.draft) setDraft(ev.draft);
        }
      }
    } catch (e) {
      append(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const entry = draft && draftToEntry(draft, options);
  const f = draft?.fields || {};
  return (
    <div data-testid="ai-assistant" className="flex flex-col gap-3">
      <div data-testid="ai-messages" className="flex max-h-[46dvh] min-h-[180px] flex-col gap-2 overflow-y-auto pr-1">
        {msgs.map((m, i) => <Bubble key={i} m={m} />)}
        {entry && (
          <div data-testid="ai-draft-card" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Bozza pronta · {entry.opt.title}</p>
            <p className="mt-1 font-display font-semibold">{f.title || f.role || f.activity || (f.from && `${f.from} → ${f.to}`) || f.where || "Nuovo annuncio"}</p>
            <p className="text-xs text-zinc-400">{[f.start_date || f.date, f.start_time || f.time, f.zone || f.town].filter(Boolean).join(" · ")}</p>
            {draft.missing?.length > 0 && <p className="mt-1 text-xs text-amber-300">Da completare: {draft.missing.join(", ")}</p>}
            <button data-testid="ai-use-draft" onClick={() => onUse(entry)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-bold">
              Controlla e invia <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {image && (
        <div className="relative w-fit">
          <img data-testid="ai-image-preview" src={imgUrl(image)} alt="" className="h-16 rounded-xl object-cover" />
          <button onClick={() => setImage("")} className="absolute -right-2 -top-2 rounded-full bg-black p-1"><X className="h-3 w-3" /></button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button data-testid="ai-attach-button" onClick={() => fileRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-violet-200" aria-label="Allega locandina">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        </button>
        <textarea data-testid="ai-input" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Link, testo o locandina…" className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-[#0B0B0F] px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none" />
        <button data-testid="ai-send-button" onClick={send} disabled={busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 disabled:opacity-50" aria-label="Invia">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden data-testid="ai-file-input" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
};

export const AiEntryCard = ({ onClick }) => (
  <button data-testid="add-ai-button" onClick={onClick} className="plus-glow mb-4 flex w-full items-center gap-3 rounded-3xl border border-violet-400/40 bg-gradient-to-r from-violet-600/30 via-pink-600/20 to-orange-500/20 p-4 text-left">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500"><Sparkles className="h-6 w-6 text-white" /></span>
    <span className="flex-1"><span className="block font-display text-base font-bold">Crea con Lucy, l'AI ✨</span><span className="text-xs text-zinc-300">Incolla un link o una locandina: compila tutto lei</span></span>
    <ArrowRight className="h-5 w-5 text-violet-200" />
  </button>
);

const RISK = { low: ["AI: ok", "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"], medium: ["AI: da verificare", "border-amber-400/40 bg-amber-500/10 text-amber-200"], high: ["AI: a rischio", "border-red-400/50 bg-red-500/15 text-red-200"] };

export const AiReviewBadge = ({ review, testId }) => {
  if (!review?.risk) return <p data-testid={testId} className="mt-2 text-[11px] text-zinc-500">AI: analisi in corso o non disponibile</p>;
  const [l, cls] = RISK[review.risk];
  return (
    <div data-testid={testId} className={`mt-2 rounded-xl border px-3 py-2 text-xs ${cls}`}>
      <p className="font-bold"><Sparkles className="mr-1 inline h-3 w-3" />{l}{review.summary ? ` · ${review.summary}` : ""}</p>
      {review.risk !== "low" && review.reasons?.length > 0 && <ul className="mt-1 list-disc pl-4 opacity-90">{review.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
    </div>
  );
};
