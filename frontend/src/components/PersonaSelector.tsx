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
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
        Persona
      </h2>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as PersonaId)}
        className="mt-3 w-full rounded-md border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      >
        {personas.map((persona) => (
          <option key={persona.value} value={persona.value}>
            {persona.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-500">{selectedPersona.description}</p>
    </section>
  );
}
