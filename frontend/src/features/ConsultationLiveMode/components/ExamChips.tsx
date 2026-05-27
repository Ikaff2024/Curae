import type { ExamType, PerformedExam } from '../types';
import { EXAM_DEFINITIONS } from '../constants';

interface ExamChipsProps {
  performedExams: PerformedExam[];
  onToggle: (exam: ExamType) => void;
}

export function ExamChips({ performedExams, onToggle }: ExamChipsProps) {
  const performedSet = new Set(performedExams.map((e) => e.type));

  return (
    <section>
      <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
        Examens réalisés au cabinet
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(EXAM_DEFINITIONS) as ExamType[]).map((examType) => {
          const isActive = performedSet.has(examType);
          return (
            <ExamChip
              key={examType}
              type={examType}
              active={isActive}
              onClick={() => onToggle(examType)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ExamChip({
  type,
  active,
  onClick,
}: {
  type: ExamType;
  active: boolean;
  onClick: () => void;
}) {
  const def = EXAM_DEFINITIONS[type];
  const baseClasses =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30';

  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} bg-teal-700 text-white hover:bg-teal-800`}
        aria-pressed="true"
      >
        <span
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[10px] font-medium text-teal-700"
          aria-hidden="true"
        >
          ✓
        </span>
        {def.shortLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50`}
      aria-pressed="false"
    >
      + {def.shortLabel}
    </button>
  );
}
