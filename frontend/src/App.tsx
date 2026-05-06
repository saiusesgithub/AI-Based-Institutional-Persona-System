import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import AvatarScene from "./components/AvatarScene";
import ChatPanel from "./components/ChatPanel";
import type { ChatMessage } from "./components/ChatPanel";
import PersonaSelector from "./components/PersonaSelector";
import VoiceControls from "./components/VoiceControls";

export default function App() {
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
import { useState } from "react";
import AssistantPanel from "./components/AssistantPanel";
import AvatarScene from "./components/AvatarScene";
import type { AvatarState, LipSyncPlayback } from "./types/avatar";

export default function App() {
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [lipSyncPlayback, setLipSyncPlayback] = useState<LipSyncPlayback | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mesh-bg pointer-events-none absolute inset-0" />
      <div className="particles-bg pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 items-start gap-6 px-6 py-6 lg:grid-cols-[1fr_1.1fr] lg:gap-6 lg:px-10 lg:py-8"
      >
        <section className="flex h-full min-w-0 flex-col gap-6">
          <header className="glass-card border-cyan-400/15 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">
              Institutional Persona System
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-slate-50">
              AI Agent Console
            </h1>
            <p className="mt-2 text-sm text-slate-300/80">
              Realtime transcripts and conversational context, ready for voice-driven sessions.
            </p>
          </header>

          <div className="glass-card border-cyan-400/15">
            <div className="flex flex-col gap-5">
              <PersonaSelector />
              <ChatPanel
                messages={messages}
                liveTranscript={liveTranscript}
                assistantState={assistantState}
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-cyan-400/20 bg-slate-950/40 p-3 text-xs text-slate-400">
            System status: microphone capture local only. Backend upload is prepared but not connected.
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-6">
          <div className="avatar-preview">
            <AvatarScene />
          <div className="flex-1">
            <AvatarScene avatarState={avatarState} lipSyncPlayback={lipSyncPlayback} />
          </div>
          <VoiceControls
            onTranscriptFinalized={handleTranscriptFinalized}
            onLiveTranscriptChange={setLiveTranscript}
            onListeningChange={handleListeningChange}
          />
        </section>
      </motion.div>
        <AssistantPanel
          onAvatarStateChange={setAvatarState}
          onLipSyncPlaybackChange={setLipSyncPlayback}
        />
      </div>
    </div>
  );
}
