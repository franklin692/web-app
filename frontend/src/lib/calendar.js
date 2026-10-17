const pad = (n) => String(n).padStart(2, "0");
const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const range = (it) => {
  const s = new Date(it.start_iso);
  const e = it.end_iso ? new Date(it.end_iso) : new Date(s.getTime() + 3 * 36e5);
  return [utc(s), utc(e)];
};
const where = (it) => [...new Set([it.address, it.zone, it.town].filter(Boolean))].join(", ");
const link = (it) => `${window.location.origin}/item/${it.id}`;
const esc = (t = "") => t.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export const googleCalUrl = (it) => {
  const [s, e] = range(it);
  const p = new URLSearchParams({ action: "TEMPLATE", text: it.title, dates: `${s}/${e}`, details: `${(it.description || "").slice(0, 500)}\n\n${link(it)}`, location: where(it) });
  return `https://calendar.google.com/calendar/render?${p}`;
};

export const downloadIcs = (it) => {
  const [s, e] = range(it);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CosaFarePotenza//IT", "BEGIN:VEVENT", `UID:${it.id}@cosafarepotenza`, `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${s}`, `DTEND:${e}`, `SUMMARY:${esc(it.title)}`, `LOCATION:${esc(where(it))}`, `DESCRIPTION:${esc((it.description || "").slice(0, 500))}`,
    `URL:${link(it)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${it.title.replace(/[^\w\s-]/g, "").slice(0, 40) || "evento"}.ics`;
  a.click();
};

export const FOLLOW_KINDS = ["venue", "place"];

export const sinceLabel = (iso) => {
  const m = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `da ${m} min` : `da ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim();
};
