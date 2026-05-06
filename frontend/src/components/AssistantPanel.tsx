import ChatPanel from "./ChatPanel";
import PersonaSelector from "./PersonaSelector";
import VoiceControls from "./VoiceControls";

export default function AssistantPanel() {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">AI Assistant</h2>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
            Standby
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Placeholder interface for persona, chat, and voice control modules.
        </p>
      </div>
      <PersonaSelector />
      <ChatPanel />
      <VoiceControls />
      <div className="mt-auto rounded-lg border border-dashed border-slate-700/70 p-3 text-xs text-slate-400">
        System status: avatar pipeline ready.
      </div>
    </aside>
  );
}
