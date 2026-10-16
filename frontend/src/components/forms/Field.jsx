export const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#0B0B0F] px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
  </label>
);

export const Select = ({ value, onChange, options, testId, placeholder }) => (
  <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none`}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

export const PrimaryButton = ({ children, className = "", ...p }) => (
  <button
    {...p}
    className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);
