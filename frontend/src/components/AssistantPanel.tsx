import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import ChatPanel from "./ChatPanel";
import type { ChatMessage } from "./ChatPanel";
import PersonaSelector from "./PersonaSelector";
import VoiceControls from "./VoiceControls";
import { generateSpeech, sendChatMessage } from "../services/chatApi";
import type { PersonaId } from "../services/chatApi";
import type { AssistantState, AvatarState } from "../types/avatar";

type AssistantPanelProps = {
  onAvatarStateChange: (state: AvatarState) => void;
};

function mapAssistantToAvatarState(state: AssistantState): AvatarState {
  return state === "generating-voice" ? "thinking" : state;
}

export default function AssistantPanel({ onAvatarStateChange }: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>("reception-assistant");
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onAvatarStateChange(mapAssistantToAvatarState(assistantState));
  }, [assistantState, onAvatarStateChange]);

  const speakWithBrowser = useCallback((text: string) => {
    if (isMuted || !("speechSynthesis" in window)) {
      setAssistantState("idle");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = selectedPersona === "chairman" ? 0.86 : 1;
    utterance.onstart = () => setAssistantState("speaking");
    utterance.onend = () => setAssistantState("idle");
    utterance.onerror = () => setAssistantState("idle");

    window.speechSynthesis.speak(utterance);
  }, [isMuted, selectedPersona]);

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio?.src && lastSpokenText) {
      speakWithBrowser(lastSpokenText);
      return;
    }

    if (!audio || !audio.src || isMuted) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
      setAssistantState("speaking");
    } catch {
      setAssistantState("idle");
    }
  }, [isMuted, lastSpokenText, speakWithBrowser]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    window.speechSynthesis?.cancel();
    setAssistantState("idle");
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((current) => {
      const nextMuted = !current;

      if (nextMuted) {
        audioRef.current?.pause();
        window.speechSynthesis?.cancel();
        setAssistantState("idle");
      }

      return nextMuted;
    });
  }, []);

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
    setVoiceError(null);
    setLastSpokenText("");
    setAssistantState("thinking");

    let responseText = "";

    try {
      const { response } = await sendChatMessage({
        message: transcript,
        persona: selectedPersona
      });
      responseText = response;
      setLastSpokenText(response);

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
      setAssistantState("idle");
      return;
    }

    setAssistantState("generating-voice");

    try {
      const voice = await generateSpeech({
        text: responseText,
        persona: selectedPersona
      });
      const audio = audioRef.current;

      setLastAudioUrl(voice.audio_url);

      if (!audio || isMuted) {
        setAssistantState("idle");
        return;
      }

      audio.src = voice.audio_url;
      audio.load();
      await audio.play();
      setAssistantState("speaking");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice generation failed.";
      setVoiceError(`${message} Using browser voice fallback.`);
      speakWithBrowser(responseText);
    }
  }, [isMuted, selectedPersona, speakWithBrowser]);

  const handleListeningChange = useCallback((isListening: boolean) => {
    setAssistantState((current) => {
      if (isListening) {
        return "listening";
      }

      return current === "listening" ? "idle" : current;
    });
  }, []);

  const handleTextSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = textInput.trim();

    if (!message || assistantState !== "idle") {
      return;
    }

    setTextInput("");
    handleTranscriptFinalized(message);
  }, [assistantState, handleTranscriptFinalized, textInput]);

  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">AI Assistant</h2>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
              assistantState === "listening"
                ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
                : assistantState === "thinking" || assistantState === "generating-voice"
                  ? "border-violet-300/50 bg-violet-300/10 text-violet-200"
                  : assistantState === "speaking"
                    ? "border-cyan-200/60 bg-cyan-200/10 text-cyan-100"
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
      <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Text Input
        </h2>
        <form onSubmit={handleTextSubmit} className="mt-3 flex gap-2">
          <input
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            disabled={assistantState !== "idle"}
            placeholder="Type when browser speech recognition is unavailable"
            className="min-w-0 flex-1 rounded-md border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:text-slate-600"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || assistantState !== "idle"}
            className="rounded-md border border-cyan-300/40 px-3 py-2 text-xs uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
          >
            Send
          </button>
        </form>
      </section>
      <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Voice Output
          </h2>
          <span className="text-xs text-slate-500">
            {lastAudioUrl ? "Ready" : "No audio"}
          </span>
        </div>
        <audio
          ref={audioRef}
          src={lastAudioUrl ?? undefined}
          muted={isMuted}
          onPlay={() => setAssistantState("speaking")}
          onEnded={() => setAssistantState("idle")}
          onPause={() => setAssistantState((current) => (current === "speaking" ? "idle" : current))}
          className="mt-3 hidden"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={playAudio}
            disabled={!lastAudioUrl}
            className="rounded-md border border-cyan-300/40 px-3 py-2 text-xs uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={stopAudio}
            disabled={!lastAudioUrl}
            className="rounded-md border border-slate-700/80 px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-300 transition hover:border-rose-300/70 hover:text-rose-100 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className={`rounded-md border px-3 py-2 text-xs uppercase tracking-[0.14em] transition ${
              isMuted
                ? "border-amber-300/60 text-amber-100"
                : "border-slate-700/80 text-slate-300 hover:border-cyan-300/70 hover:text-cyan-100"
            }`}
          >
            {isMuted ? "Muted" : "Mute"}
          </button>
        </div>
        {voiceError ? (
          <p className="mt-3 text-xs text-amber-200">{voiceError}</p>
        ) : null}
      </section>
      <VoiceControls
        onTranscriptFinalized={handleTranscriptFinalized}
        onLiveTranscriptChange={setLiveTranscript}
        onListeningChange={handleListeningChange}
      />
      <div className="mt-auto rounded-lg border border-dashed border-slate-700/70 p-3 text-xs text-slate-400">
        System status: responses are routed through Gemini and ElevenLabs voice output.
      </div>
    </aside>
  );
}
