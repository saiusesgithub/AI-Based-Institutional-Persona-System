import { motion } from "framer-motion";
import { useState } from "react";

const personas = ["Reception Assistant", "Faculty Member", "HOD", "Chairman"];

export default function PersonaSelector() {
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);

  return (
    <section className="glass-card border-cyan-400/15">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Persona
        </h2>
        <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/80">
          select profile
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {personas.map((persona) => {
          const isSelected = persona === selectedPersona;

          return (
            <motion.button
              key={persona}
              type="button"
              onClick={() => setSelectedPersona(persona)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${
                isSelected
                  ? "border-cyan-300/70 bg-cyan-400/10 text-cyan-50 shadow-[0_0_25px_rgba(34,211,238,0.15)]"
                  : "border-slate-800/70 bg-slate-950/40 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-400/5"
              }`}
            >
              <span className="font-medium">{persona}</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  isSelected ? "bg-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.6)]" : "bg-slate-600"
                }`}
              />
            </motion.button>
          );
        })}
      </div>
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
