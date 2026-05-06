export default function ChatPanel() {
  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Conversation
        </h3>
        <span className="text-xs text-emerald-300/80">Idle</span>
      </div>
      <div className="mt-3 rounded-lg border border-slate-800/60 bg-slate-950/60 p-3 text-sm text-slate-300">
        <p>Incoming and outgoing messages will appear here.</p>
      </div>
    </section>
  );
}
