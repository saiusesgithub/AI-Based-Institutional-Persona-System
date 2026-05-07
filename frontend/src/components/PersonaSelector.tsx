import type { PersonaId } from "../services/chatApi";

type PersonaSelectorProps = {
  value: PersonaId;
  onChange: (persona: PersonaId) => void;
};

const personas: Array<{ value: PersonaId; label: string; description: string }> = [
  {
    value: "reception-assistant",
    label: "Reception Assistant",
    description: "Warm front-desk guidance"
  },
  {
    value: "hod",
    label: "HOD",
    description: "Academic department guidance"
  },
  {
    value: "chairman",
    label: "Chairman",
    description: "Formal institutional leadership"
  }
];

export default function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const selectedPersona = personas.find((persona) => persona.value === value) ?? personas[0];

  return (
    <section className="rounded-[24px] border border-slate-800/70 bg-slate-900/35 p-2">
      <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
        Persona
      </h2>
      <div className="mt-1.5 grid gap-2">
        {personas.map((persona) => {
          const isSelected = persona.value === value;

          return (
            <button
              key={persona.value}
              type="button"
              onClick={() => onChange(persona.value)}
              className={`rounded-2xl border px-3 py-2 text-left transition ${
                isSelected
                  ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
                  : "border-slate-700/70 bg-slate-950/55 text-slate-300 hover:border-cyan-300/30 hover:bg-slate-900/75"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{persona.label}</span>
                <span className="rounded-full border border-slate-700/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {persona.value === "reception-assistant" ? "Front desk" : persona.value}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{persona.description}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{selectedPersona.description}</p>
    </section>
  );
}
