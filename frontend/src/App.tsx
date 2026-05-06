import AssistantPanel from "./components/AssistantPanel";
import AvatarScene from "./components/AvatarScene";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex h-full flex-col gap-4">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
              Institutional Persona System
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Realtime Avatar Preview</h1>
            <p className="mt-2 text-sm text-slate-400">
              GLB avatar rendering with environment lighting and mesh inspection.
            </p>
          </header>
          <div className="flex-1">
            <AvatarScene />
          </div>
        </section>
        <AssistantPanel />
      </div>
    </div>
  );
}
