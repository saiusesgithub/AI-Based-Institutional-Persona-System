import { useCallback, useState } from "react";
import ChatPanel from "./ChatPanel";
import type { ChatMessage } from "./ChatPanel";
import PersonaSelector from "./PersonaSelector";
import VoiceControls from "./VoiceControls";
import { sendChatMessage } from "../services/chatApi";
import type { PersonaId } from "../services/chatApi";

export default function AssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [assistantState, setAssistantState] = useState<"idle" | "listening" | "thinking">("idle");
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>("reception-assistant");

  const handleTranscriptFinalized = useCallback(async (transcript: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: transcript,
      createdAt: new Date()
    };

    setMessages((current) => [
      ...current,
      userMessage
    ]);
    setLiveTranscript("");
    setAssistantState("thinking");

    try {
      const { response } = await sendChatMessage({
        message: transcript,
        persona: selectedPersona
      });

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response,
          createdAt: new Date()
        }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach the AI service.";

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "system",
          text: message,
          createdAt: new Date()
        }
      ]);
    } finally {
      setAssistantState("idle");
    }
  }, [selectedPersona]);

  const handleListeningChange = useCallback((isListening: boolean) => {
    setAssistantState((current) => {
      if (isListening) {
        return "listening";
      }

      return current === "listening" ? "idle" : current;
    });
  }, []);

  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">AI Assistant</h2>
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
        <p className="mt-2 text-xs text-slate-400">
          Push-to-talk voice input with realtime transcript capture.
        </p>
      </div>
      <PersonaSelector value={selectedPersona} onChange={setSelectedPersona} />
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
      <div className="mt-auto rounded-lg border border-dashed border-slate-700/70 p-3 text-xs text-slate-400">
        System status: transcripts are routed to the persona-aware Gemini backend.
      </div>
    </aside>
  );
}
