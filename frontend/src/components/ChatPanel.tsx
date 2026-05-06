export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: Date;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  liveTranscript: string;
  assistantState: "idle" | "listening" | "thinking";
};

export default function ChatPanel({ messages, liveTranscript, assistantState }: ChatPanelProps) {
  const stateLabel = assistantState === "listening" ? "Listening" : assistantState === "thinking" ? "Thinking" : "Idle";

  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Conversation
        </h3>
        <span className="text-xs text-emerald-300/80">{stateLabel}</span>
      </div>
      <div className="mt-3 flex max-h-64 min-h-40 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-800/60 bg-slate-950/60 p-3 text-sm text-slate-300">
        {messages.length === 0 && !liveTranscript ? (
          <p className="text-slate-500">Voice transcripts will appear here as user messages.</p>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
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
          </article>
        ))}

        {liveTranscript ? (
          <article className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-50">
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
              Live transcript
            </div>
            <p>
              {liveTranscript}
              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-emerald-200 align-middle" />
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
