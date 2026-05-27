import type { Patient } from '../types';
import { CONSULTATION_TYPE_LABELS } from '../constants';

interface PatientSidebarProps {
  patient: Patient;
  onViewFullHistory?: () => void;
}

export function PatientSidebar({
  patient,
  onViewFullHistory,
}: PatientSidebarProps) {
  return (
    <aside
      className="overflow-y-auto border-r border-slate-200 bg-white p-3.5"
      aria-label={`Dossier patient ${patient.fullName}`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-800"
          aria-hidden="true"
        >
          {patient.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900">
            {patient.fullName}
          </div>
          <div className="text-[11px] text-slate-500">
            {patient.sex} · {patient.ageYears} ans
            {patient.weightKg && ` · ${patient.weightKg} kg`}
          </div>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-1">
        <span className="rounded-sm border border-teal-700 bg-white px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
          {CONSULTATION_TYPE_LABELS[patient.consultationType]}
        </span>
        <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          #{patient.reference}
        </span>
      </div>

      {patient.history.length > 0 && (
        <section className="mb-3.5">
          <SectionLabel>⚠ Antécédents critiques</SectionLabel>
          <div className="space-y-1">
            {patient.history.map((item) => (
              <HistoryItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {patient.medications.length > 0 && (
        <section className="mb-3.5">
          <SectionLabel>Traitements actifs</SectionLabel>
          <div className="space-y-1">
            {patient.medications.map((med) => (
              <div
                key={med.id}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5"
              >
                <div className="text-xs text-slate-900">{med.name}</div>
                <div className="text-[10px] text-slate-500">
                  {med.dosage} · {med.frequency}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel className="mb-0">Historique</SectionLabel>
          {onViewFullHistory && (
            <button
              type="button"
              onClick={onViewFullHistory}
              className="text-[10px] text-teal-700 hover:underline"
            >
              tout voir →
            </button>
          )}
        </div>
        <ol className="relative space-y-2.5 pl-3.5">
          <span
            className="absolute left-1 top-1.5 bottom-1.5 w-px bg-slate-200"
            aria-hidden="true"
          />
          {patient.timeline.slice(0, 4).map((event) => (
            <li key={event.id} className="relative">
              <span
                className={`absolute -left-3.5 top-1 h-2 w-2 rounded-full border-2 border-white ${
                  event.isHighlighted ? 'bg-teal-700' : 'bg-slate-300'
                }`}
                aria-hidden="true"
              />
              <div
                className={`text-[11px] ${
                  event.isHighlighted
                    ? 'font-medium text-slate-900'
                    : 'text-slate-900'
                }`}
              >
                {event.title}
              </div>
              <div className="text-[10px] text-slate-500">
                {formatShortDate(event.date)}
                {event.summary && ` · ${event.summary}`}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function SectionLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-1.5 text-[10px] uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </div>
  );
}

function HistoryItem({
  item,
}: {
  item: Patient['history'][number];
}) {
  const styles =
    item.severity === 'critical'
      ? 'border-l-red-600 bg-red-50 text-red-900'
      : item.severity === 'warning'
        ? 'border-l-amber-600 bg-amber-50 text-amber-900'
        : 'border-l-blue-600 bg-blue-50 text-blue-900';

  return (
    <div className={`rounded-r-md border-l-[3px] px-2.5 py-1.5 ${styles}`}>
      <div className="text-xs font-medium">{item.label}</div>
      {item.detail && (
        <div className="text-[10px] opacity-80">{item.detail}</div>
      )}
      {item.since && !item.detail && (
        <div className="text-[10px] opacity-80">depuis {item.since}</div>
      )}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
