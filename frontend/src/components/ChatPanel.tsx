import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import type { AssistantState } from "../types/avatar";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: Date;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  liveTranscript: string;
  assistantState: AssistantState;
};

export default function ChatPanel({ messages, liveTranscript, assistantState }: ChatPanelProps) {
  const stateLabel = assistantState === "listening" ? "Listening" : assistantState === "thinking" ? "Thinking" : "Idle";
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const showTyping = assistantState === "thinking" && !liveTranscript;
  const timeline = useMemo(() => messages, [messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [timeline, liveTranscript, assistantState]);
  const stateLabel =
    assistantState === "listening"
      ? "Listening"
      : assistantState === "thinking"
        ? "Thinking"
        : assistantState === "generating-voice"
          ? "Generating voice"
          : assistantState === "speaking"
            ? "Speaking"
            : "Idle";

  return (
    <section className="glass-card border-cyan-400/15">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Conversation
        </h3>
        <span className="text-xs text-emerald-300/80">{stateLabel}</span>
      </div>
      <div
        ref={scrollRef}
        className="mt-3 flex max-h-96 min-h-56 flex-col gap-3 overflow-y-auto rounded-lg border border-cyan-400/10 bg-slate-950/60 p-4 text-sm text-slate-300"
      >
        {messages.length === 0 && !liveTranscript ? (
          <p className="text-slate-500">Voice transcripts will appear here as user messages.</p>
        ) : null}

        {messages.map((message) => (
          <motion.article
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`rounded-lg px-3 py-2 ${
              message.role === "user"
                ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-50"
                : "border border-slate-700/70 bg-slate-900/70 text-slate-300"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <span>{message.role}</span>
              <time>{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <p>{message.text}</p>
          </motion.article>
        ))}

        {liveTranscript ? (
          <motion.article
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-50"
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
              Live transcript
            </div>
            <p>
              {liveTranscript}
              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-emerald-200 align-middle" />
            </p>
          </motion.article>
        ) : null}

        {showTyping ? (
          <motion.article
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-slate-300"
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">assistant</div>
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
          </motion.article>
        ) : null}

        {assistantState === "thinking" || assistantState === "generating-voice" ? (
          <article className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-violet-50">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-violet-200/70">
              {assistantState === "thinking" ? "Thinking" : "Generating voice"}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-200" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-200 [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-200 [animation-delay:240ms]" />
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
