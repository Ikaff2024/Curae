import { Plus } from 'lucide-react';
import type { Vital } from '../types';
import { VitalCard } from './VitalCard';

interface VitalsRowProps {
  vitals: Vital[];
  onAdd: () => void;
}

export function VitalsRow({ vitals, onAdd }: VitalsRowProps) {
  return (
    <section className="mb-4">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
        Constantes du jour
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {vitals.map((vital) => (
          <VitalCard key={vital.id} vital={vital} />
        ))}
        <AddVitalButton onClick={onAdd} />
      </div>
    </section>
  );
}

function AddVitalButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[60px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2.5 text-slate-500 transition-colors hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
      aria-label="Ajouter une constante vitale"
    >
      <Plus className="h-4 w-4" strokeWidth={1.75} />
      <span className="mt-0.5 text-[9px]">Ajouter</span>
    </button>
  );
}
