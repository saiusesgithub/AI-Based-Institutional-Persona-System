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
  const stateLabel =
    assistantState === "listening"
      ? "Listening"
      : assistantState === "thinking"
        ? "Thinking"
        : assistantState === "streaming"
          ? "Streaming"
          : assistantState === "generating-audio"
            ? "Generating audio"
            : assistantState === "processing-lipsync"
              ? "Processing lip sync"
              : assistantState === "speaking"
                ? "Speaking"
                : "Idle";

  return (
    <section className="flex min-h-0 flex-col rounded-[24px] border border-slate-800/70 bg-slate-900/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
          Conversation
        </h3>
        <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
          {stateLabel}
        </span>
      </div>
      <div className="mt-2.5 flex min-h-0 max-h-[15rem] flex-1 flex-col gap-2 overflow-y-auto rounded-[20px] border border-slate-800/60 bg-slate-950/60 p-2 text-sm text-slate-300">
        {messages.length === 0 && !liveTranscript ? (
          <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-950/50 px-4 py-6 text-slate-500">
            Voice transcripts will appear here as user messages.
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-2xl px-3 py-2.5 ${
              message.role === "user"
                ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-50"
                : message.role === "system"
                  ? "border border-amber-300/20 bg-amber-300/10 text-amber-50"
                  : "border border-slate-700/70 bg-slate-900/70 text-slate-300"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <span>{message.role}</span>
              <time>{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <p>
              {message.text}
              {message.role === "assistant" && assistantState === "streaming" ? (
                <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-cyan-200 align-middle" />
              ) : null}
            </p>
          </article>
        ))}

        {liveTranscript ? (
          <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2.5 text-emerald-50">
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
              Live transcript
            </div>
            <p>
              {liveTranscript}
              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-emerald-200 align-middle" />
            </p>
          </article>
        ) : null}

        {assistantState === "thinking" || assistantState === "generating-voice" || assistantState === "processing-lipsync" ? (
          <article className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2.5 text-cyan-50">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">
        {assistantState === "thinking" ||
        assistantState === "streaming" ||
        assistantState === "generating-audio" ||
        assistantState === "processing-lipsync" ? (
          <article className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-violet-50">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-violet-200/70">
              {assistantState === "thinking"
                ? "Thinking"
                : assistantState === "streaming"
                  ? "Streaming response"
                  : assistantState === "generating-audio"
                    ? "Generating audio"
                    : "Processing lip sync"}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200 [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-200 [animation-delay:240ms]" />
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
