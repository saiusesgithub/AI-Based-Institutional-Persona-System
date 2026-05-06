import { motion } from "framer-motion";
import AssistantPanel from "./components/AssistantPanel";
import AvatarScene from "./components/AvatarScene";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mesh-bg pointer-events-none absolute inset-0" />
      <div className="particles-bg pointer-events-none absolute inset-0" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_420px]"
      >
        <section className="flex h-full flex-col gap-4">
          <header className="glass-card border-cyan-400/20 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">
              Institutional Persona System
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-slate-50">
              Realtime Avatar Preview
            </h1>
            <p className="mt-2 text-sm text-slate-300/80">
              Cinematic lighting, live waveform capture, and immersive presence.
            </p>
          </header>
          <div className="flex-1">
            <AvatarScene />
          </div>
        </section>
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <AssistantPanel />
        </div>
      </motion.div>
    </div>
  );
}
