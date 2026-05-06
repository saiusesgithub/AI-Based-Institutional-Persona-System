export default function PersonaSelector() {
  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
        Persona
      </h2>
      <select className="mt-3 w-full rounded-md border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm text-slate-100">
        <option>Reception Assistant</option>
        <option>Faculty Member</option>
        <option>HOD</option>
        <option>Chairman</option>
      </select>
    </section>
  );
}
