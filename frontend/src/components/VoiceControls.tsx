export default function VoiceControls() {
  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
        Voice Controls
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        <button className="rounded-md bg-emerald-400/90 px-3 py-2 text-sm font-medium text-emerald-950">
          Start Listening
        </button>
        <button className="rounded-md border border-slate-700/80 px-3 py-2 text-sm text-slate-200">
          Stop Listening
        </button>
      </div>
    </section>
  );
}
