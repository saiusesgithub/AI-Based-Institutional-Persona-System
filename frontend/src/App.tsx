import { useState } from "react";
import AssistantPanel from "./components/AssistantPanel";
import AvatarScene from "./components/AvatarScene";
import type { AvatarState, LipSyncPlayback } from "./types/avatar";

export default function App() {
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [lipSyncPlayback, setLipSyncPlayback] = useState<LipSyncPlayback | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,1))]" />
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <main className="relative mx-auto grid min-h-screen max-w-7xl gap-3 px-4 py-4 sm:px-5 sm:py-5 xl:h-screen xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:overflow-hidden">
        <section className="flex min-h-0 flex-col gap-2 xl:overflow-hidden">
          <header className="rounded-[28px] border border-cyan-300/10 bg-slate-950/45 px-4 py-2 shadow-[0_0_60px_rgba(8,145,178,0.08)] backdrop-blur-xl sm:px-5 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-cyan-200/80">
              <span>Institutional Persona System</span>
              <span className="h-px w-10 bg-cyan-300/40" />
              <span>Realtime AI showcase</span>
            </div>
            <h1 className="mt-1.5 max-w-2xl text-3xl font-semibold tracking-tight text-slate-50 sm:text-[2.05rem] xl:text-[2.5rem]">
              Cinematic AI operations console.
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400 sm:text-[0.9rem]">
              Hero-led dashboard for voice, avatar, and live response flow.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-300">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5">Live transcript</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5">Voice routing</span>
              <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5">Persona controls</span>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <AssistantPanel
              onAvatarStateChange={setAvatarState}
              onLipSyncPlaybackChange={setLipSyncPlayback}
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-2 xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)]">
          <div className="rounded-[28px] border border-slate-800/60 bg-slate-950/50 px-4 py-2 shadow-[0_0_70px_rgba(8,145,178,0.1)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/75">Avatar showcase</p>
                <p className="mt-1 text-sm text-slate-400">Portrait-framed AI presence with locked cinematic framing.</p>
              </div>
              <div className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                {avatarState}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <AvatarScene avatarState={avatarState} lipSyncPlayback={lipSyncPlayback} />
          </div>
        </section>
      </main>
    </div>
  );
}
