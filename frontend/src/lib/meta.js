import { CalendarDays, Martini, MapPin, Sparkles, HeartHandshake } from "lucide-react";

export const KINDS = {
  event: { label: "Evento", plural: "Eventi", icon: CalendarDays, color: "text-pink-400", bg: "bg-pink-500/15", ring: "border-pink-500/30" },
  venue: { label: "Locale", plural: "Locali", icon: Martini, color: "text-violet-300", bg: "bg-violet-500/15", ring: "border-violet-500/30" },
  place: { label: "Luogo", plural: "Luoghi", icon: MapPin, color: "text-sky-300", bg: "bg-sky-500/15", ring: "border-sky-500/30" },
  activity: { label: "Corso & Attività", plural: "Corsi & Attività", icon: Sparkles, color: "text-emerald-300", bg: "bg-emerald-500/15", ring: "border-emerald-500/30" },
};

export const ADD_OPTIONS = [
  { kind: "event", title: "Nuovo Evento", sub: "Festa, serata, concerto, sagra", icon: CalendarDays, grad: "from-pink-500 to-violet-600" },
  { kind: "venue", title: "Nuovo Locale", sub: "Ristorante, pub, bar, disco", icon: Martini, grad: "from-violet-500 to-indigo-600" },
  { kind: "place", title: "Luogo Pubblico", sub: "Piazze, parchi, ritrovi", icon: MapPin, grad: "from-sky-500 to-violet-600" },
  { kind: "activity", title: "Corso / Attività", sub: "Corsi, sport, associazioni", icon: Sparkles, grad: "from-emerald-500 to-sky-600" },
  { kind: "spotted", title: "Nuovo Spotted 💘", sub: "Hai incrociato qualcuno?", icon: HeartHandshake, grad: "from-orange-500 to-pink-600" },
];

export const CATEGORIES = {
  event: ["DJ Set / Discoteca", "Concerto", "Teatro", "Cinema", "Mostra", "Sagra", "Aperitivo / DJ Set", "Festa privata", "Sport", "Altro"],
  venue: ["Pub", "Bar", "Cocktail Bar", "Ristorante", "Pizzeria", "Discoteca", "Sala giochi", "Altro"],
  place: ["Passeggio / Centro", "Parco", "Piazza", "Università", "Centro commerciale", "Belvedere", "Altro"],
  activity: ["Musica", "Teatro", "Sport", "Escursioni", "Associazione culturale", "Museo", "Volontariato", "Altro"],
};

export const TOWNS = ["Potenza", "Abriola", "Avigliano", "Brienza", "Castelmezzano", "Lagonegro", "Lauria", "Maratea", "Marsico Nuovo", "Melfi", "Muro Lucano", "Picerno", "Pietrapertosa", "Pignola", "Rionero in Vulture", "Sasso di Castalda", "Tito", "Venosa", "Viggiano", "Altro comune"];

export const ZONES = ["Centro Storico", "Via Pretoria", "Rione Santa Maria", "Macchia Romana", "Gallitello", "Montereale", "Poggio Tre Galli", "Rione Lucania", "Bucaletto", "Malvaccaro", "Basento", "Rione Mancusi", "Cocuzzo", "Serpentone"];

export const SPOT_TAGS = [
  { id: "", label: "Tutti" },
  { id: "unibas", label: "UNIBAS" },
  { id: "mcdonalds", label: "McDonald's" },
  { id: "centro", label: "Centro Storico" },
  { id: "trasporti", label: "Autobus/Treno" },
  { id: "locali", label: "Locali" },
  { id: "altro", label: "Altro" },
];
export const tagLabel = (id) => SPOT_TAGS.find((t) => t.id === id)?.label || "Altro";

export const LEVELS = {
  1: { label: "In movimento", emoji: "⚡", cls: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
  2: { label: "Di tendenza stasera", emoji: "🔥", cls: "bg-orange-500/15 text-orange-300 border-orange-400/40" },
  3: { label: "Molto frequentato", emoji: "🔥🔥", extra: "20+ presenti", cls: "bg-gradient-to-r from-orange-500/25 to-pink-500/25 text-orange-200 border-orange-400/50" },
  4: { label: "Pieno / Evento Top", emoji: "🚀", extra: "50+ presenti", cls: "bg-gradient-to-r from-pink-500/30 to-violet-500/30 text-pink-100 border-pink-400/60" },
};

export const STATUS = {
  pending: { label: "In attesa", cls: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  approved: { label: "Approvato", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  rejected: { label: "Rifiutato", cls: "bg-red-500/15 text-red-300 border-red-400/30" },
};
export const LISTING_STATUS = { ...STATUS, completato: { label: "Completato", cls: "bg-sky-500/15 text-sky-300 border-sky-400/30" }, scaduto: { label: "Scaduto", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-400/30" } };

export const EMPTY_ITEM = { title: "", category: "", town: "Potenza", zone: "", description: "", image_url: "", instagram: "", info_link: "", address: "", opening_hours: "", start_date: "", start_time: "", end_time: "", price: "" };
export const EMPTY_SPOTTED = { where: "", when: "", who: "", message: "", tag: "altro" };

export const whenLabel = (it) => {
  if (it.kind !== "event" || !it.start_iso) return null;
  if (it.live) return "IN CORSO";
  const d = new Date(it.start_iso);
  const today = new Date();
  const t = it.start_time || d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Stasera · ${t}`;
  const tomorrow = new Date(today.getTime() + 864e5);
  if (d.toDateString() === tomorrow.toDateString()) return `Domani · ${t}`;
  return `${d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · ${t}`;
};

export const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min fa`;
  if (s < 86400) return `${Math.floor(s / 3600)} h fa`;
  return `${Math.floor(s / 86400)} g fa`;
};
