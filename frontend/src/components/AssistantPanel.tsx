import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import ChatPanel from "./ChatPanel";
import type { ChatMessage } from "./ChatPanel";
import PersonaSelector from "./PersonaSelector";
import VoiceControls from "./VoiceControls";

export default function AssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [assistantState, setAssistantState] = useState<"idle" | "listening" | "thinking">("idle");

  const handleTranscriptFinalized = useCallback((transcript: string) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: transcript,
        createdAt: new Date()
      }
    ]);
    setLiveTranscript("");
    setAssistantState("thinking");
    window.setTimeout(() => setAssistantState("idle"), 700);
  }, []);

  const handleListeningChange = useCallback((isListening: boolean) => {
    setAssistantState(isListening ? "listening" : "idle");
  }, []);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex h-full flex-col gap-6 rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(8,15,30,0.65)] backdrop-blur lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto"
    >
      <div className="glass-card border-cyan-400/20">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-100">AI Assistant</h2>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
              assistantState === "listening"
                ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
                : assistantState === "thinking"
                  ? "border-violet-300/50 bg-violet-300/10 text-violet-200"
                  : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
            }`}
          >
            {assistantState}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-300/80">
          Voice-first control with realtime transcription and neural response states.
        </p>
      </div>
      <PersonaSelector />
      <ChatPanel
        messages={messages}
        liveTranscript={liveTranscript}
        assistantState={assistantState}
      />
      <VoiceControls
        onTranscriptFinalized={handleTranscriptFinalized}
        onLiveTranscriptChange={setLiveTranscript}
        onListeningChange={handleListeningChange}
      />
      <div className="mt-auto rounded-lg border border-dashed border-cyan-400/20 bg-slate-950/40 p-3 text-xs text-slate-400">
        System status: microphone capture local only. Backend upload is prepared but not connected.
      </div>
    </motion.aside>
  );
}
